QUnit.test('Object.values', function (assert) {
    var l;
    l = {a: 1, b:2};
    assert.deepEqual(Object.values(l), [1, 2]);
    l = [1, 2];
    assert.deepEqual(Object.values(l), [1, 2]);
});

QUnit.test('String.formatU', function (assert) {
    assert.equal("abc.{0}-{1}".formatU([5, 6]), 'abc.5-6');
    assert.equal("abc.{key}-{key}".formatU({key: 5}), 'abc.5-5');
});

QUnit.test('String.formatU-decimal_number', function (assert) {
    assert.equal("abc.{0}".formatU([5.1]), 'abc.5.1', 'one decimal');
    assert.equal("abc.{0}".formatU([5.11]), 'abc.5.11', '2 decimals');
    assert.equal("abc.{0}".formatU([5.111]), 'abc.5.111', '3 decimals');
    assert.equal("abc.{0}".formatU([5.1111]), 'abc.5.1111', '4 decimals');
    assert.equal("abc.{0}".formatU([5.11111]), 'abc.5.11111', '5 decimals');
    assert.equal("abc.{0}".formatU([5.111111]), 'abc.5.111111', '6 decimals');
    assert.equal("abc.{0}".formatU([5.1111111]), 'abc.5.111111', '7 decimals - trimmed');
    assert.equal("abc.{0}".formatU([0.000006]), 'abc.0.000006', '6 decimals - ok');
    assert.equal("abc.{0}".formatU([0.0000066]), 'abc.0.000007', '7 decimals - rounded');
});

QUnit.test('parse_hash-garden', function(assert) {
    assert.deepEqual(parse_hash('#garden=Cuchubo'), {garden: 'Cuchubo'});
    assert.deepEqual(parse_hash('#garden=cuchubo'), {garden: 'cuchubo'});
});

QUnit.test('parse_hash-map', function(assert) {
    assert.deepEqual(parse_hash('#map=1/2/3'), {map: {zoom:1, lat:2, lon:3}});
    assert.deepEqual(parse_hash('#map=1/2.1/3.2'), {map: {zoom:1, lat:2.1, lon:3.2}});
});

QUnit.test('parse_hash-garden-map', function(assert) {
    var parsed = parse_hash('#garden=Cuchubo;map=1/2/3');
    assert.deepEqual(parsed['garden'], 'Cuchubo');
    assert.deepEqual(parsed['map'], {zoom:1, lat:2, lon:3});
});

QUnit.test('parse_hash-ignore', function(assert) {
    assert.deepEqual(parse_hash('#maps=1/2/3'), {});
    assert.deepEqual(parse_hash('#mapu=1/2.1/3.2'), {});
});

QUnit.test('shorten', function(assert) {
    assert.deepEqual(shorten(''), '');
    assert.deepEqual(shorten('Cnidoscolus'), 'kniduskulus');
    assert.deepEqual(shorten('Cnidoscolos'), 'kniduskulus');
    assert.deepEqual(shorten('Cnedoscolos'), 'kniduskulus');
    assert.deepEqual(shorten('Theobroma'), 'tiubruma');
    assert.deepEqual(shorten('Chamomilla'), 'kamumila');
    assert.deepEqual(shorten('Chamomila'), 'kamumila');
    assert.deepEqual(shorten('Cocos nucifera'), 'kukus nusifira');
    assert.deepEqual(shorten('Cocos nocifera'), 'kukus nusifira');
    assert.deepEqual(shorten('Coccos nocifera'), 'kukus nusifira');
});


QUnit.test('set_alternative', function(assert) {
    var fix = $('#qunit-fixture');
    fix.append($('<i/>', { id: 'test', class: 'icon-black' }));
    assert.ok($('i#test').hasClass('icon-black'));
    assert.notOk($('i#test').hasClass('icon-orange'));
    set_alternative('i#test', 'icon', 'orange');
    assert.ok($('i#test').hasClass('icon-orange'));
    assert.notOk($('i#test').hasClass('icon-black'));
    set_alternative('i#test', 'icon', 'red');
    assert.ok($('i#test').hasClass('icon-red'));
    assert.notOk($('i#test').hasClass('icon-orange'));
});
