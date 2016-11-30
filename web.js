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
            // Get the gardens collection
            var gardens = db.collection('gardens');

            // We have a cursor now with our find criteria.
            // Having a cursor does not mean we performed any database access, yet.
            var cursor = gardens.aggregate({$lookup:{from:"plants", foreignField:"garden", localField:"name", as:"plants"}},
                                           {$project: {name:1, lat: 1, lon: 1, contact: 1,
                                                       draggable: {$literal: false},
                                                       title: "$name",
                                                       zoom: {$literal: 1},
                                                       prototype: {$literal: "garden"},
                                                       count: {$size: "$plants"}}},
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
        }});

    socket.on('select-garden', function (name) {
        dbclient.connect(dburl, function (err, db) {
            var plants, gardens, cursor;
            if (err) {
                console.log('Unable to connect to the mongoDB server. Error:', err);
            } else {
                // first of all, tell the client to set the view on the garden
                cursor = db.collection('gardens').findOne({name:name}, function(err, doc) {
                    if (err || !doc) {
                        console.log("err:", err, "; doc:", doc);
                    } else {
                        console.log(doc);
                        socket.emit('map-set-view', doc);
                    }
                });

                // Get the plants relative to this garden
                plants = db.collection('plants');

                // We get a cursor with our find criteria.
                // Having a cursor does not mean we performed any database access, yet.
                cursor = plants.aggregate({$match:{garden:name}},
                                              {$lookup:{from:"taxa", localField:"species", foreignField:"name", as:"taxon"}},
                                              {}
                                             );
                // Lets iterate on the result.
                // this will access the database, so we act in a callback.
                cursor.each(function (err, doc) {
                    if (err || !doc) {
                        console.log("err:", err, "; doc:", doc);
                    } else {
                        socket.emit('add-object', doc);
                    }
                });

                db.close();
            }});
    });
    
});

