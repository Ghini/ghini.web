db.gardens.find().sort({id:-1}).limit(1)  // the garden with the highest numerical id

function maxIdPlusOne(collection) {
    var documentWithMax = collection.find().sort({id:-1}).limit(1);
    return documentWithMax.id + 1;
}

db.gardens.insert(
    {
        // put here all the fields you need, but ¡include the maxIdPlusOne!
        id: maxIdPlusOne(db.gardens)
    }
)

db.gardens.updateMany( { id: { $exists: false } }, {$set: {id: maxIdPlusOne(db.gardens)}});

db.infopanels.find().snapshot().forEach(function (elem) {
    db.infopanels.update({_id: elem._id},
                         {$set: {garden_id: parseInt(elem.audio.substr(2,3)),
                                id_within_garden: parseInt(elem.audio.substr(6,3))}});
});
db.infopanels.find().snapshot().forEach(function (elem) {db.infopanels.update({_id: elem._id}, {$unset: {audio: ""}})});
db.infopanels.find().snapshot().forEach(function (elem) {db.infopanels.update({_id: elem._id}, {$set: {text: elem.description}})});
db.infopanels.find().snapshot().forEach(function (elem) {db.infopanels.update({_id: elem._id}, {$unset: {description: "", id_within_garden: "", garden_id: ""}})});
