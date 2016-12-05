ghini
=====

a web based interface to botanical garden databases

rationale
---------

ghini, the name is inspired to Luca Ghini, has the aim to offer a web-based
interface to a database complying to the ITF2 reccomendations.

the idea is born in august 2012, after Mario Frasca (mathematician) and
Saskia Bantjes (agronomist, environmentalist) get in contact with the
cuchubo garden in Mompox. the wish to describe it, the thankful words by the
president of the foundation named after the cuchubo garden, pushes the two
to seek formal help at the botanical garden of the utrecht university, where
they get support by the conservator Eric Gouda.

current plan
============

this program presents botanical collections in geographic context. the
collection is managed with an independent program and we advocate usage of
line 1.0 of ghini.desktop.

the user exports the complete plants collection in json format and we import
it into ghini.web.

you need a script to import your data from the json export to the ghini.web
database.

ghini.web is the code running at the site http://gardens.ghini.me

Setting Up
==========

Simply put: download the code, and install the dependencies.

First of all, you need a recent version of `nodejs`. The one bundled with
Debian8, and possibly with anything based on Debian, is v0.10.29, and that's
far too old. Follow the instructions on nodejs.org, or trust me and do the
following:

```
curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
sudo apt-get install -y nodejs
```

ghini.web is a npm-based program. To get all further dependencies: `npm
install`. To start the server: `nodejs web.js`.

If npm gets confused, `rm -fr ./node_modules/` and try again.

Database Connection
===================

ghini.web keeps its data in a mongodb database. initialize it by running the
import tool, or set up a sample database by running the sometrees.js script.

using it
========

* use ghini.desktop to export your database in json format,

* not yet decided how to do this, but you need define the coordinates of the
  plants,

  * keep coordinates in a text note, with category coords, value decimal
    degrees separated with a semicolon, first the latitude.
  
* start `nodejs web.js`,

* look at your data on `http://localhost:5000/`,

* open issues to suggest how to change ghini.web.
