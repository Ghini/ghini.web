// This file is part of ghini.web
// http://github.com/Ghini/ghini.web
//
// ghini.web is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at
// your option) any later version.
//
// ghini.web is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public
// License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with ghini.  If not, see <http://www.gnu.org/licenses/>.
//
// this is the configuration file

var config = {};

config.port = 5000;
config.database_url = 'postgresql://bscratch:btest52@localhost/bscratch';
//config.database_url = 'sqlite3:/home/mario/.bauble/tanager.db';

module.exports = config;
