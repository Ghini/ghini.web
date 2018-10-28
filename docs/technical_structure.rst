technical structure
--------------------

``ghini.web`` is the combination of two pieces of software, one running on
the remote server as a Node.js application, the other running on the local
web browser, as a JavaScript client of the former Node.js server.  I will
not introduce separate names for the two components, I will call them both
``ghini.web``, the former being ``ghini.web-the_server`` and the latter
``ghini.web-the_client``, or, in short: GWtS and GWtC.

the server
===========

Our Node.js program ``ghini.web-the_server`` serves static files —like a
normal web server— and dynamic data through an API. The dynamic data served
describes gardens and collections, and the access functions we need to the
data can be grouped this way:

* garden related

  * reading

    * get a list of all gardens, with their name and geographic coordinates.
    * get a verbose description of the garden, really a web page.
    * look up gardens by name
    * get a list of pictures taken in the garden, not associated to plants.

  * writing

    * add a garden to the list
    * add a picture to a garden

* plant related
 
  * reading

    * get a list of all plants in a garden (with accession name,
      coordinates, names of pictures).
    * get the miniature of a specific picture.
    * get the full resolution version of a specific picture.
  
  * writing

    * add a plant to a garden
    * add a picture to a plant

the client
===========

GWtC is a single page web client, initialised to a map of the world, with
dots at the locations of the gardens participating to the project.

Clicking on a garden pops up a window, where you can read a description of
the garden selected, and you can choose to enter the garden. Entering a
garden implies zooming in to a level where individual plants will become
visible on the map.

While the garden pop up is active, the rest of the interface is grayed
out. You can also close the pop up without selecting the garden, this will
reactivate the map without changing the zoom.

the connection server ←→ client
==================================

I am not yet decided, but I don't know if we should implement a normal
restful api, or if we should keep a socket open between client and
server. In the latter case, which is what I have been experimenting with
from the beginning, a client registers with the server and requests data
through the channel that stays open the whole time.

The advantage of this approach is that the server can initiate changes on
clients, and in case a client does change something in the database, the
fact can be reflected at all other clients. It will probably not be that
relevant as of now, but it does not make things more complex, and I suspect
it offers more future flexibility.

frequent actions
------------------

updating dependencies

| ``sudo npm install -g npm-check-updates``
| ``ncu -u``
| ``npm install``

setting aliases
------------------

``db.gardens.find().
    forEach(function(item) {db.gardens.update(
        {_id: item._id},
        {$set:{aliases:[item.name, slugify(item.name)]}})});``

``slugify = function (text) {
return text.toLowerCase().
    replace(/[áàä]/,'a').
    replace(/[éèë]/,'e').
    replace(/[íìï]/,'i').
    replace(/[óòö]/,'o').
    replace(/[úùü]/,'u').
    replace(/ /g,'-').
    replace(/[-]+/g, '-').
    replace(/[^\w-]+/g,'');}``
