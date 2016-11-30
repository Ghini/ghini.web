// This file is part of ghini.web
// http://github.com/Ghini/ghini.web

// ghini.web is free software: you can redistribute ghini.web and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 2 of the License, or (at
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
// GLOBAL VARIABLES
var map = null;

var socket;

// properties of 'listOf' are accessions, species, genera, familiae, and
// their values are the list of the matching markers.
var listOf = {};

// properties of 'taxonOf' are accessions and the associated value is
// the list of taxa at rank family, genus, species.
var taxonOf = {};

// the normal and highlighting icons...
var icon;

// all markers!!!
var markers = [];
// highlighted markers!
markers.highlighted = [];

// the layers on which we group plants, indexed by zoom level.
var plant_layer = [];

// layers of which we can toggle the visibility
var toggleLayer = {};

//
// GLOBAL FUNCTIONS

function openHighlightModal(e) {
    $('#highlightModal').modal('show');
    map.closePopup();
    computeHighlightOptions(e.target.options.accession);
}

function fireHighlightModal() {
    resetHighlightOptions();
    if(map._popup) {
        var accession = map._popup.options.marker.options.accession;
        $('#keyword').val(accession);
    }
    computeHighlightOptions($("#keyword").val());
    $('#highlightModal').modal('show');
    return false;
}

function resetHighlightOptions() {
    $("#highlightOptions").empty();
    while(markers.highlighted.length)
        markers.highlighted.pop().setIcon(icon.gray);
}

function computeHighlightOptions(name) {
    $("#keyword").val(name);
    resetHighlightOptions();
    if(name === "") {
        return;
    }
    var div = $('#highlightOptions');

    function addRadioButton(taxon, text) {
        var label = $('<label/>');
        div.append(label);
        var elem = $('<input/>',
                     { type: 'radio',
                       name: 'taxon',
                       value: taxon
                     });
        label.append(elem);
        label.append(" " + text);
    }

    if (name in taxonOf) {
        addRadioButton(taxonOf[name].family, taxonOf[name].family);
        addRadioButton(taxonOf[name].genus, taxonOf[name].genus);
        addRadioButton(taxonOf[name].genus + " " + taxonOf[name].species, taxonOf[name].species);
        addRadioButton(name, name);
    }
}

function doHighlight() {
    var whatToHighlight = $("input[name=taxon]:checked").val();
    console.log(whatToHighlight);
    console.log(listOf[whatToHighlight]);
    for (var i = 0; i<listOf[whatToHighlight].length; i++) {
        var marker = listOf[whatToHighlight][i];
        console.log(marker);
        marker.setIcon(icon.black);
        markers.highlighted.push(marker);
    }
}

var lastEvent;
function fireAddPlant(e) {
    lastEvent = e;
    $('#addendum').val("2014.0");
    $('#addPlantModal').modal('show');
    return false;
}

function doAddPlant() {
    var threshold = map.getZoom();
    var layer = plant_layer[threshold];
    if (layer === null)
        return;
    if ($('#addendum').val() === "")
        return;

    var item= {};
    var plantParts = $('#addendum').val().split(".");
    plantParts.push("1");
    item.plant_short = "{2}".formatU(plantParts);
    item.plant = "{0}.{1}.{2}".formatU(plantParts);
    item.accession = "{0}.{1}".formatU(plantParts);
    item.lat = lastEvent.latlng.lat;
    item.lng = lastEvent.latlng.lng;
    item.zoom = threshold;
    item.family = item.genus = item.species = item.vernacular = "";

    finalAddObject(item);
    socket.emit("add-object", item);

    addToDom(item.plant, threshold, [item.lat, item.lng]);
}

var prototype_format = {};
prototype_format['garden'] = '<b>{name}</b><br/>contact: {contact}<br/>mapped plants: {count}<br/>' +
    '<a onclick="fireSelectGarden(\'{name}\'); return false;", href="#">zoom to garden</a><br/>' +
    '<a onclick="fireSelectGarden(\'\'); return false;", href="#">zoom to world</a>';
prototype_format['plant'] = '<b>{code}</b><br/>{vernacular}<br/>{species}<br/>';
prototype_format['photo'] = '<b>{title}</b><br/>{name}<br/>';
prototype_format['infopanel'] = '<b>{title}</b><br/>{text}<br/>';

function fireSelectGarden(e) {
    map.closePopup();
    socket.emit('select-garden', e);
    return false;
}

function finalAddObject(item) {
    var marker = L.marker([item.lat, item.lon],
                          item);
    markers.push(marker);
    marker.addTo(plant_layer[1]).bindPopup(prototype_format[item['prototype']].formatU(item),
                                           {marker: marker});
}


// add info about named plant to DOM (so we can easily copy it)
function addToDom(name, threshold, location) {
    // is it already there? (id contains dots, so we select carefully)
    var paragraph = $(document.getElementById(name));
    if (paragraph.length === 0) {
        paragraph = $('<p/>', { id: name });
        $('#accessions').append(paragraph);
    }
    paragraph.html(name + "," + threshold + "," + location);
}

function onDragend(event) {
    var marker = event.target;
    var data = { accession: marker.options.accession,
                 plant: marker.options.plant,
                 lat: marker.getLatLng().lat,
                 lng: marker.getLatLng().lng
               };
    data.plant_short = data.plant.split(".")[2];
    socket.emit('move', data);
}

function toggleLayerCheck(anchor, layerName) {
    var layer = toggleLayer[layerName];
    var check = anchor.childNodes[0];
    if(map.hasLayer(layer)) {
        map.removeLayer(layer);
        check.className = "icon-remove icon-black";
    } else {
        map.addLayer(layer);
        check.className = "icon-ok icon-black";
    }
}

// MIT-licensed code by Benjamin Becquet
// https://github.com/bbecquet/Leaflet.PolylineDecorator
L.RotatedMarker = L.Marker.extend({
    options: { angle: 0 },
    _setPos: function(pos) {
        L.Marker.prototype._setPos.call(this, pos);
        if (L.DomUtil.TRANSFORM) {
            // use the CSS transform rule if available
            this._icon.style[L.DomUtil.TRANSFORM] += ' rotate(' + this.options.angle + 'deg)';
        } else if (L.Browser.ie) {
            // fallback for IE6, IE7, IE8
            var rad = this.options.angle * L.LatLng.DEG_TO_RAD,
            costheta = Math.cos(rad),
            sintheta = Math.sin(rad);
            this._icon.style.filter += ' progid:DXImageTransform.Microsoft.Matrix(sizingMethod=\'auto expand\', M11=' +
                costheta + ', M12=' + (-sintheta) + ', M21=' + sintheta + ', M22=' + costheta + ')';
        }
    }
});

L.rotatedMarker = function(pos, options) {
    return new L.RotatedMarker(pos, options);
};
// MIT-licensed code - end

// read a file from the server (asynchronously)
function getFileFromServer(url, doneCallback) {
    var xhr;

    xhr = new XMLHttpRequest();
    xhr.onreadystatechange = handleStateChange;
    xhr.open("GET", url, true);
    xhr.send();

    function handleStateChange() {
        if (xhr.readyState === 4) {
            doneCallback(xhr.status == 200 ? xhr.responseText : null);
        }
    }
}

// set by zoomstart, examined by zoomend.
var previous_zoom = 0;

function onZoomstart() {
    // remember the previous zoom, so you know whether you're zooming
    // in, or out.
    previous_zoom = map.getZoom();
}

function onZoomend() {
    // are we zooming out?
    if (previous_zoom > map.getZoom()) {
        map.removeLayer(plant_layer[previous_zoom]);
    } else { // then we are zooming in!
        map.addLayer(plant_layer[map.getZoom()]);
    }
}

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

// to be called at document ready!
function init() {

    // ---------------------------
    // initialize global variables

    // open the communication socket!!!
    socket = io.connect(window.location.href);

    // create a map in the "map" div
    map = L.map('map');

    // create one layer for each zoom level
    for (var i = 0; i<24; i++) {
        plant_layer[i] = L.layerGroup();
    }

    icon = {
        'garden': L.AwesomeMarkers.icon({ color: '#ffffff',
                                          icon: 'info-sign' }),
        'gray': L.icon({
            iconUrl: './res/bullet-lightgray.png',
            iconSize:     [16, 16], // size of the icon
            iconAnchor:   [8, 8], // point of the icon which will correspond to marker's location
            popupAnchor:  [0, -4] // point from which the popup should open relative to the iconAnchor
        }),
        'black': L.icon({
            iconUrl: './res/bullet-black.png',
            iconSize:     [16, 16], // size of the icon
            iconAnchor:   [8, 8], // point of the icon which will correspond to marker's location
            popupAnchor:  [0, -4] // point from which the popup should open relative to the iconAnchor
        })
    };

    // add the scale control
    L.control.scale().addTo(map);

    map.setView([32.0, 8.0], 5); // go to center of world map - somewhere in Africa
    console.log(map.getZoom());
    for (i=1; i<=map.getZoom(); i++)
        map.addLayer(plant_layer[i]);

    // create an OpenStreetMap tile layer
    L.tileLayer(
        // 'http://{s}.tile.osm.org/{z}/{x}/{y}.png', // osm server (most frequently updated)
        // 'http://a.www.toolserver.org/tiles/bw-mapnik/{z}/{x}/{y}.png', // black & white
        // 'http://otile1.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png', // mapquest
        // 'http://cuchubo.wdfiles.com/local--files/tiles-{z}/{z}.{y}.{x}.png', // our tiles on wikidot
        //'tiles-{z}/{z}.{y}.{x}.png', // local tiles on rune
        'http://tilecache.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
        { attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
          minZoom: 19,
          maxZoom: 20
        }).addTo(map);

    L.tileLayer(
        'http://{s}.tile.osm.org/{z}/{x}/{y}.png', // osm server (most frequently updated)
        // 'http://a.www.toolserver.org/tiles/bw-mapnik/{z}/{x}/{y}.png', // black & white
        // 'http://otile1.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png', // mapquest
        // 'http://cuchubo.wdfiles.com/local--files/tiles-{z}/{z}.{y}.{x}.png', // our tiles on wikidot
        { attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
          minZoom: 1,
          maxZoom: 18
        }).addTo(map);


    // associate callbacks to events
    //map.on('contextmenu', fireAddPlant);
    map.on('zoomend', onZoomend);
    map.on('zoomstart', onZoomstart);
    $("#keyword").val("");
    $("#keyword").on('change', function(e){computeHighlightOptions($("#keyword").val());});
    $("#addendum").on('change', function(e){return false;});

    map.on('popupopen', function(e) {
        map._popup.options.minWidth = $('div.leaflet-popup-content img').width() + 10;
        map._popup.update();
        $('div.leaflet-popup-content img').onload = function() {
            map._popup.options.minWidth = $('div.leaflet-popup-content img').width() + 10;
            map._popup.update();
        };
        $('div.leaflet-popup-content a.thumbnail').click(function (e) {
            $('#showPhotoModal h3').html($(this).attr('title-text'));
            $('#showPhotoModal img').attr('src', $(this).attr('data-img-url'));
            $('#showPhotoModal').modal('show');
        });
        return false;
    });

    // REACT ON MESSAGES ON THE COMMUNICATION SOCKET
    socket.on('move', function(data) {
        listOf[data.plant].setLatLng([data.lat, data.lng]);
    });

    // initialize the help menu
    socket.on('init-help', function (data) {
        for(var i=0; i<data.length; i++){
            var item = data[i];
            var div = $("<div/>", { id: item.name + "Modal",
                                    class: "modal hide fade",
                                    style: "display: none;"
                                  });

            $(document.body).append(div);
            var header_div = $('<div/>', { class: 'modal-header' });
            var body_div = $('<div/>', { class: 'modal-body' });
            div.append(header_div).append(body_div);

            header_div.append($('<a/>', { class: 'close', 'data-dismiss': 'modal'}).text("×"));
            header_div.append($('<h3/>').text(item.title));

            // add the reference to the dialog box to the help menu.
            var list_item = $('<li/>');
            console.log(item.name);
            var anchor = $('<a/>', { onclick: "$('#" + item.name + "Modal').modal('show'); return false;", href: "#" });
            var icon = $('<i/>', { class: "icon-" + item.icon + " icon-black" });
            $("#help-menu-list").append(list_item);
            list_item.append(anchor);
            anchor.append(icon);
            anchor.append(" ");
            anchor.append(item.anchor);
            body_div.html(item.content);
        }
    });


    // initialize the toggle menu
    socket.on('init-toggle', function(data) {
        for(var i=0; i<data.length; i++){
            var group = data[i];
            var layer = toggleLayer[group.layerName] = L.layerGroup();
            var list_item = $('<li/>');
            $('#toggle-menu-list').append(list_item);
            var anchor = $('<a/>',
                           { href: '#',
                             onclick: 'toggleLayerCheck(this, "' + group.layerName + '"); return false;'
                           });
            list_item.append(anchor);
            var icon_element = $('<i/>', { class: 'icon-remove icon-black' });
            anchor.append(icon_element);
            anchor.append(" " + group.layerName);

            var icon = L.AwesomeMarkers.icon({ color: group.color,
                                               icon: group.icon });

            for (var j=0; j < group.items.length; j++) {
                var item = group.items[j];
                var marker = L.marker([item.lat, item.lng],
                                      { icon: icon });
                marker.addTo(layer).bindPopup(item.content);
            }
        }
    });

    socket.on('add-object', finalAddObject);
    socket.on('map-set-view', function(doc) {
        map.setView([doc.lat, doc.lon], doc.zoom);
    });
}
