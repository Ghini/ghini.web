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

var fs = require('fs');

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

// Upon a successful connection, we send the complete list of plants for
// which we have the geographic coordinates, and register three handlers that
// will be used as receivers of client changes. The client will emit
// messages of type 'move', 'insert', 'delete'.
io.sockets.on('connection', function (socket) {

    // initialize client's help menu
    fs.readFile("private/res/elements-help.txt", "binary", function(err, file) {
        if(err) {
            return;
        }
        var result = [];
        var i = 0;
        var arrayOfLines = file.split(/[\r\n]/);
        for(; i<arrayOfLines.length; i++) {
            var item = {};
            // header: 0:name, 1:anchor, 2:title, 3:icon
            var header = arrayOfLines[i].split(',');
            item.name = header[0];
            item.anchor = header[1];
            item.title = header[2];
            item.icon = header[3];

            // add the dialog box to the document body

            // read the content of the dialog box from the file.
            var content = [];
            for(i++; i<arrayOfLines.length; i++) {
                content.push(arrayOfLines[i]);
                if (arrayOfLines[i] === "")
                    break;
            }
            item.content = content.join("");
            result.push(item);
        }
        socket.emit('init-help', result);
    });
    
    // initialize client's toggle menu
    fs.readFile("private/res/elements-toggle.txt", "binary", function(err, file) {
        if(err) {
            return;
        }
        var result = [];
        var i = 0;
        var arrayOfLines = file.split(/[\r\n]/);
        for(; i<arrayOfLines.length; i++) {
            var group = {};
            var parts = arrayOfLines[i].split(",");
            group.layerName = parts[0];
            group.color = parts[1];
            group.icon = parts[2];
            var format = parts[3];
            group.items = [];
            for (i++; i < arrayOfLines.length; i++) {
                parts = arrayOfLines[i].split(",");
                if(parts.length === 1)
                    break;
                group.items.push({ lat: parseFloat(parts[0]), 
                                  lng: parseFloat(parts[1]),
                                  content: format.formatU(parts)
                                });
            }

            result.push(group);
        }
        socket.emit('init-toggle', result);
    });

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

                db.close();
            }});
    });
    
});

