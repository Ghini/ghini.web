// This file is part of ghini.web
// http://github.com/Ghini/ghini.web
//
// ghini.web is free software: you can redistribute ghini.web and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or (at
// your option) any later version.
//
// ghini.web is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public
// License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with ghini.web.  If not, see <http://www.gnu.org/licenses/>.
//
// this is the remote server

var http = require('http');
http.globalAgent.maxSockets = 10;

var config = require('./config');
var express = require("express");
var app = express();
var port = Number(process.env.PORT || config.port);  // servicing on port
var dburl = process.env.DATABASE_URL || config.database_url;
console.log(dburl);

var mongodb = require('mongodb');
var dbclient = mongodb.MongoClient;
const mongoose = require('mongoose');

String.prototype.formatU = function() {
    var str = this.toString();
    if (!arguments.length)
        return str;
    var args = typeof arguments[0];
    args = (("string" == args || "number" == args) ? arguments : arguments[0]);
    for (var arg in args)
        str = str.replace(RegExp("\\{" + arg + "\\}", "gi"), args[arg]);
    return str;
};

app.set('views', __dirname + '/views');
app.set('view engine', "pug");
app.engine('pug', require('pug').__express);
app.use(express.static(__dirname + '/public'));

var favicon = require('serve-favicon');
app.use(favicon(__dirname + '/public/img/favicon.ico'));

app.get("/", function(req, res){
    res.render("map");
    console.log(dburl);
});

app.get("/panels/:garden_id", (req, res) => {
    var connection = mongoose.createConnection(dburl);
    connection.on('connected', () => {
        var schema = new mongoose.Schema({});
        var Panel = connection.model('infopanels', schema);
        var result = [];

        Panel.
            aggregate([{$match: {garden_id: parseInt(req.params.garden_id)}}]).
            cursor().
            exec().
            on('data', (doc) => {
                var language = "en";  // hard coded fttb
                doc.url = ("http://www.ghini.me/raw/" +
                           doc.audio.substr(0,6) + language + doc.audio.substr(5));
                result.push(doc);
            }).
            on('error', (err) => {
                console.log("err:", err);
            }).
            on('end', () => {
                res.render('panel', {doc: result});
            });
    });
});

app.get("/gardens", (req, res) => {
    var connection = mongoose.createConnection(dburl);
    connection.on('connected', () => {
        var schema = new mongoose.Schema({});
        var Garden = connection.model('garden', schema);
        var result = [];

        Garden.
            aggregate([ {$sort: {name:1}},
                        {$lookup: {from:"infopanels", foreignField:"garden", localField:"name", as:"infopanels"}},
                        {$project: {name:1, lat: 1, lon: 1, contact: 1,
                                    title: "$name",
                                    infopanels: {$size: "$infopanels"}}} ]).
            cursor().
            exec().
            on('data', (doc) => {result.push(doc)}).
            on('error', (err) => {
                console.log("err:", err);
            }).
            on('end', () => {
                res.render('garden', {doc: result});
            });
    });
});

// make the application listen to the port
// we pass the ExpressJS server to Socket.io. In effect, our real time
// communication will still happen on the same port.
var io = require('socket.io').listen(app.listen(port, function() {
            console.log("Listening on " + port);
        }));

io.sockets.on('connection', function (socket) {
    // Upon a successful connection, we send the list of gardens, with the
    // plants count per garden. gardens are objects as any other object, they
    // have associated the colour red and the icon home, and the zoom at which
    // they appear is 2. then we issue the command 'map-set-view' to the world.

    // The client will use the garden icons or menu item to zoom into a
    // garden (issue the 'select-garden' command), upon receiving this
    // command, we issue the command 'map-set-view' to the garden position
    // and extent, followed by the lists of objects relative to the selected
    // garden. these include plants, photos, infopanels.
    dbclient.connect(dburl, function (err, db) {
        if (err) {
            console.log('Unable to connect to the mongoDB server. Error:', err);
        } else {
            // Get the collection of all gardens, each with the amount of plants;
            // We store our find criteria in a cursor.
            // Having a cursor does not mean we performed any database access, yet.
            var cursor = db.collection('gardens').aggregate(
                {$sort:{name:1}},
                {$lookup:{from:"plants", foreignField:"garden", localField:"name", as:"plants"}},
                {$lookup:{from:"photos", foreignField:"garden", localField:"name", as:"photos"}},
                {$lookup:{from:"infopanels", foreignField:"garden", localField:"name", as:"infopanels"}},
                {$project: {layer_name: {$literal: "gardens"},
                            layer_zoom: {$literal: 1},
                            name:1, lat: 1, lon: 1, contact: 1,
                            title: "$name",
                            plants: {$size: "$plants"},
                            photos: {$size: "$photos"},
                            infopanels: {$size: "$infopanels"},
                            draggable: {$literal: false},
                            color: {$literal: "red"},
                            icon: {$literal: "home"}}},
                {});
            // Lets iterate on the result.
            // this will access the database, so we act in a callback.
            cursor.each(function (err, doc) {
                if (err || !doc) {
                    console.log("err:", err, "; doc:", doc);
                } else {
                    socket.emit('add-object', doc);
                }
            });
            cursor = db.collection('plants').aggregate(
                {$sort:{code:1}},
                {$group: {_id: {species:"$species", garden: "$garden"}, count: {$sum: 1}, plants: {$push: {_id: "$_id", code: "$code"}}}},
                {$group: {_id: {species:"$_id.species"},
                          gardens: {$push: {name: "$_id.garden", plant_count: "$count", plants: "$plants"}}}},
                {$lookup: {from:"taxa", localField:"_id.species", foreignField:"name", as:"taxon"}},
                {$unwind: {path: "$taxon"}},
                {$project: {_id: "$taxon._id",
                            phonetic: "$taxon.phonetic",
                            species_name: "$taxon.name",
                            family_name: "$taxon.family",
                            gardens: 1, taxon: 1,
                            layer_name: {$literal: "__taxa"}}},
                {$sort:{family_name:1, species_name:1}},
                {});
            // Lets iterate on the result.
            // this will access the database, so we act in a callback.
            cursor.each(function (err, doc) {
                if (err || !doc) {
                    console.log("err:", err, "; doc:", doc);
                } else {
                    socket.emit('add-object', doc);
                }
            });
        }});

    socket.on('select-garden', function (args) {
        // wipe all data which is relative to the current garden
        socket.emit('map-remove-objects', 'plants');
        socket.emit('map-remove-objects', 'photos');
        socket.emit('map-remove-objects', 'infopanels');
        var defaults = {
            zoom: 2,
            lat: 32.0,
            lon: 8.0
        };
        if ('map' in args) {
            Object.assign(args, args.map);
        } else {
            Object.assign(args, defaults);
        }
        if (!('garden' in args)) {
            console.log(args);
            socket.emit('map-set-view', args);
            return;
        }
        dbclient.connect(dburl, function (err, db) {
            if (err) {
                console.log('Unable to connect to the mongoDB server. Error:', err);
            } else {
                // first of all, tell the client to set the view on the
                // garden; the garden document contains lat, lon, and zoom.
                var cursor = db.collection('gardens').findOne({name:args['garden']}, function(err, doc) {
                    if (err || !doc) {
                        console.log("err:", err, "; doc:", doc, "garden not found", args);
                        console.log('map-set-view', args);
                        socket.emit('map-set-view', args);
                    } else {
                        if ('map' in args) {
                            Object.assign(doc, args.map);
                        }
                        console.log('map-set-view', doc);
                        socket.emit('map-set-view', doc);
                    }
                });

                // Get the plants relative to this garden.
                // We store our find criteria in a cursor.
                // Having a cursor does not mean we performed any database access, yet.
                cursor = db.collection('plants').aggregate(
                    {$match:{garden:args['garden']}},
                    {$lookup:{from:"taxa", localField:"species", foreignField:"name", as:"taxon"}},
                    {$unwind: {path: "$taxon"}},
                    {$project: {layer_name: {$literal: "plants"},
                                layer_zoom: "$zoom",
                                lat: 1, lon: 1, species:1, taxon:1, code:1,
                                title: "$code",
                                species_name: "$taxon.name",
                                vernacular: "$taxon.vernacular",
                                phonetic: "$taxon.phonetic",
                                family: "$taxon.family",
                                draggable: {$literal: false},
                                color: {$literal: "green"},
                                icon: {$literal: "tree-evergreen"}}},
                    {}
                );
                // Lets iterate on the result.
                // this will access the database, so we act in a callback.
                cursor.each(function (err, doc) {
                    if (err || !doc) {
                        console.log("err:", err, "; doc:", doc);
                    } else {
                        switch(doc.family){
                        case 'Arecaceae':
                            doc.icon = 'palm-tree';
                            break;
                        case 'Musaceae':
                            doc.icon = 'banana-tree';
                            break;
                        case 'Araucariaceae':
                        case 'Cupressaceae':
                        case 'Cycadaceae':
                        case 'Ephedraceae':
                        case 'Ginkgoaceae':
                        case 'Gnetaceae':
                        case 'Pinaceae':
                        case 'Podocarpaceae':
                        case 'Sciadopityaceae':
                        case 'Taxaceae':
                        case 'Welwitschiaceae':
                        case 'Zamiaceae ':
                            doc.icon = 'tree-conifer';
                            break;
                        case 'Anemiaceae':
                        case 'Apleniaceae':
                        case 'Aspleniaceae':
                        case 'Athyriaceae':
                        case 'Blechnaceae':
                        case 'Cibotiaceae':
                        case 'Culcitaceae':
                        case 'Cyatheaceae':
                        case 'Cystodiaceae':
                        case 'Cystopteridaceae':
                        case 'Davalliaceae':
                        case 'Dennstaedtiaceae':
                        case 'Dicksoniaceae':
                        case 'Diplaziopsidaceae':
                        case 'Dipteridaceae':
                        case 'Dryopteridacae':
                        case 'Dryopteridaceae':
                        case 'Equisetaceae':
                        case 'Gleicheniaceae':
                        case 'Hymenophyllaceae':
                        case 'Hypodematiaceae':
                        case 'Isoëtaceae':
                        case 'Lindsaeaceae':
                        case 'Lomariopsidaceae':
                        case 'Lonchitidaceae':
                        case 'Loxsomataceae':
                        case 'Lycopodiaceae':
                        case 'Lygodiaceae':
                        case 'Marattiaceae':
                        case 'Marsileaceae':
                        case 'Matoniaceae':
                        case 'Metaxyaceae':
                        case 'Nephrolepidaceae':
                        case 'Oleandraceae':
                        case 'Onocleaceae':
                        case 'Ophioglossaceae':
                        case 'Osmundaceae':
                        case 'Plagiogyriaceae':
                        case 'Polypodiaceae':
                        case 'Psilotaceae':
                        case 'Pteridaceae':
                        case 'Rhachidosoraceae':
                        case 'Saccolomataceae':
                        case 'Salviniaceae':
                        case 'Schizaeaceae':
                        case 'Selaginellaceae':
                        case 'Tectariaceae':
                        case 'Thelypteridaceae':
                        case 'Thyrsopteridaceae':
                        case 'Woodsiaceae':
                            // doc.icon = 'fern'; // there is no such icon yet
                            break;
                        case 'Asteraceae':
                            doc.icon = 'compositae';
                            break;
                        }
                        socket.emit('add-object', doc);
                    }
                });

                // same for the photos
                cursor = db.collection('photos').aggregate(
                    {$match:{garden:args['garden']}},
                    {$project: {layer_name: {$literal: "photos"},
                                layer_zoom: "$zoom",
                                lat: 1, lon: 1, title: 1, name: 1,
                                draggable: {$literal: false},
                                color: {$literal: "cadetblue"},
                                icon: {$literal: "camera"}}},
                    {}
                );
                cursor.each(function (err, doc) {
                    if (err || !doc) {
                        console.log("err:", err, "; doc:", doc);
                    } else {
                        socket.emit('add-object', doc);
                    }
                });

                // same for the infopanels
                cursor = db.collection('infopanels').aggregate(
                    {$match:{garden:args['garden']}},
                    {$project: {layer_name: {$literal: "infopanels"},
                                layer_zoom: "$zoom",
                                lat: 1, lon: 1, title: 1, text: 1,
                                draggable: {$literal: false},
                                color: {$literal: "purple"},
                                icon: {$literal: "info-sign"}}},
                    {}
                );
                cursor.each(function (err, doc) {
                    if (err || !doc) {
                        console.log("err:", err, "; doc:", doc);
                    } else {
                        socket.emit('add-object', doc);
                    }
                });

            }});
    });

});
