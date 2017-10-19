// Copyright 2017 Google Inc.
//
//   Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
// limitations under the License.


/**
 * DracoLoader
 *
 * Singleton class for loading and parsing compressed
 * draco model files.
 */

import { EventEmitter } from 'eventemitter3';

class StaticDracoLoader extends EventEmitter {

	constructor() {
		super();
		this.dracoLoader = null;
	}

	/**
	 * Loads a single draco file from a given url.
	 * Returns a promise that resolves when the file is loaded and parsed.
	 */
	load( url ) {

		return new Promise( ( resolve, reject ) => {

			if ( !this.dracoLoader ) {
				this.dracoLoader = new THREE.DRACOLoader();
			}

			this.dracoLoader.load( url, geometry => {
				resolve( { geometry: geometry, url: url } );
			});

		});
	}

	/**
	 * Loads multiple files from a given array of URLs.
	 * A webworker will be used for parsing the data if the second parameter is true.
	 * Returns a promise which resolves once all files are loaded.
	 */
	loadMultiple( urls, useWorker ) {
		return new Promise( ( resolve, reject ) => {
			var promises = urls.map( url => {
				return this.load( url, useWorker );
			});

			Promise.all( promises ).then( results => {
				var resultsByURL = {};
				results.forEach( result => { resultsByURL[ result.url ] = result.geometry; });
				resolve( resultsByURL );
			});
		});
	}
}

// export let DracoLoader = new StaticDracoLoader();
