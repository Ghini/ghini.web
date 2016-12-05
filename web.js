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

var config = require('./config');
var express = require("express");
var app = express();
var port = Number(process.env.PORT || config.port);  // servicing on port
var dburl = process.env.DATABASE_URL || config.database_url;
console.log(dburl);

var mongodb = require('mongodb');
var dbclient = mongodb.MongoClient;

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
                {$lookup:{from:"plants", foreignField:"garden", localField:"name", as:"plants"}},
                {$project: {layer_name: {$literal: "gardens"},
                            layer_zoom: {$literal: 2},
                            name:1, lat: 1, lon: 1, contact: 1,
                            title: "$name",
                            count: {$size: "$plants"},
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
                    console.log(doc);
                    socket.emit('add-object', doc);
                }
            });
            db.close();
            socket.emit('map-set-view', {zoom:2, lat:32.0, lon:8.0});
        }});

    socket.on('select-garden', function (name) {
        // wipe all data which is relative to the current garden
        socket.emit('map-remove-objects', 'plants');
        socket.emit('map-remove-objects', 'photos');
        socket.emit('map-remove-objects', 'infopanels');
        if (name === '') {
            socket.emit('map-set-view', {zoom:2, lat:32.0, lon:8.0});
            return;
        }
        dbclient.connect(dburl, function (err, db) {
            if (err) {
                console.log('Unable to connect to the mongoDB server. Error:', err);
            } else {
                // first of all, tell the client to set the view on the
                // garden; the garden document contains lat, lon, and zoom.
                var cursor = db.collection('gardens').findOne({name:name}, function(err, doc) {
                    if (err || !doc) {
                        console.log("err:", err, "; doc:", doc);
                    } else {
                        console.log(doc);
                        socket.emit('map-set-view', doc);
                    }
                });

                // Get the plants relative to this garden.
                // We store our find criteria in a cursor.
                // Having a cursor does not mean we performed any database access, yet.
                cursor = db.collection('plants').aggregate(
                    {$match:{garden:name}},
                    {$lookup:{from:"taxa", localField:"species", foreignField:"name", as:"taxon"}},
                    {$project: {layer_name: {$literal: "plants"},
                                layer_zoom: "$zoom",
                                lat: 1, lon: 1, species:1, taxon:1, code:1,
                                title: "$code",
                                vernacular: "$taxon.vernacular",
                                family: "$taxon.family",
                                draggable: {$literal: false},
                                color: {$literal: "green"},
                                icon: {$literal: "leaf"}}},
                    {}
                );
                // Lets iterate on the result.
                // this will access the database, so we act in a callback.
                cursor.each(function (err, doc) {
                    if (err || !doc) {
                        console.log("err:", err, "; doc:", doc);
                    } else {
                        console.log(doc);
                        socket.emit('add-object', doc);
                    }
                });

                // same for the photos
                cursor = db.collection('photos').aggregate(
                    {$match:{garden:name}},
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
                        console.log(doc);
                        socket.emit('add-object', doc);
                    }
                });

                // same for the infopanels
                cursor = db.collection('infopanels').aggregate(
                    {$match:{garden:name}},
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
                        console.log(doc);
                        socket.emit('add-object', doc);
                    }
                });

                db.close();
            }});
    });
    
});

