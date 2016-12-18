var shorten = function(x) {
    return x.toLowerCase().replace(/-/, '').replace(/ph/g, 'f')
        .replace(/h/g, '').replace(/[cq]/g, 'k').replace(/z/g, 's')
        .replace(/ae/g, 'e').replace(/[ye]/g, 'i').replace(/u/g, 'o')
        .replace(/(.)\1/g, '$1');
};

function match_people(plant_species, input) {
    var reg = new RegExp(shorten(input), 'i');
    return plant_species.filter(function (item) {
        return item['_id'].match(reg);
    });
}

function generate_guid() {
    var S4 = function() {
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}

function present_item(item) {
    var result = [];
    var row = $('<tr/>', {class: 'match_item'});
    row.append($('<td/>', {class: 'binomial', text: item.name})
               .click(function(x){markers_setcolor('gardens', item.garden, 'orange');})
               .mouseleave(function(x){markers_setcolor('gardens', item.garden, 'red');})
              );
    row.append($('<td/>', {class: 'family', text: item.taxon.family}));
    result.push(row);
    for(var i in item.garden) {
        row = $('<tr/>', {class: 'garden_row'});
        row.append($('<td/>', {class: 'garden_name', text: item.garden[i]}));
        row.append($('<td/>', {class: 'plant_count', text: item.plant_count[i]}));
        result.push(row);
    }
    return result;
}

function match_species(objs, val) {
    $('#result').empty();
    if(val.length > 2) {
        var to_add = match_people(objs, val).map(present_item);
        for(var i in to_add) {
            console.log(i, to_add[i]);
            $('#result').append(to_add[i]);
        }
    }
}

function zip(arrays) {
    return arrays[0].map(function(_,i){
        return arrays.map(function(array) { return array[i]; } );
    });
}      
