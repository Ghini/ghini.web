technical structure
--------------------

``ghini.web`` is the combination of two pieces of software, one running on the remote server as a Node.js 
application, the other running on the local web browser, as a JavaScript client of the former Node.js server. 
I will not introduce separate names for the two components, I will call them both ``ghini.web``,
the former being ``ghini.web-the_server`` and the latter ``ghini.web-the_client``, or, in short: GWtS and GWtC.

the server
===========

our Node.js program ``ghini.web-the_server`` serves static files like a normal web server 
and dynamic data through a restful web api.

the dynamic data served describes gardens and collections, so GWtS offers ways to:

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

    * get a list of all plants in a garden (with accession name, coordinates, names of pictures).
    * get the miniature of a specific picture.
    * get the full resolution version of a specific picture.
  
  * writing

    * add a plant to a garden
    * add a picture to a plant

the client
===========

GWtC is a single page web client, initialised to a map of the world, with dots at the locations of the gardens participating to the project.

clicking on a garden pops up a window, where you can read a description of the garden selected, and you can choose to enter the garden. entering a garden implies zooming in to a level where individual plants will become visible on the map.

while the garden pop up is active, the rest of the interface is grayed out. you can also close the pop up without selecting the garden, this will reactivate the map without changing the zoom.

frequent actions
------------------

updating dependencies

| ``sudo npm install -g npm-check-updates``
| ``ncu -u``

