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
 * GLTFLoader
 *
 * Singleton class for loading and parsing compressed
 * GLTF model files.
 */

import { EventEmitter } from 'eventemitter3';

class StaticGLTFLoader extends EventEmitter {

	/**
	 * Loads a single gltf file from a given url.
	 * Returns a promise that resolves when the file is loaded and parsed.
	 */
	load( url ) {

		if ( !this.gltfLoader ) {
			this.gltfLoader = new THREE.GLTF2Loader();
		}

		return new Promise( ( resolve, reject ) => {
			this.gltfLoader.load( url, gltf => {
				resolve( { gltf: gltf, url: url } )
			}, progress => {
				this.emit( 'progress', progress );
			}, error => {
				reject( error );
			});
		});
	}

	/**
	 * Loads multiple files from a given array of URLs.
	 * Returns a promise which resolves once all files are loaded.
	 */
	loadMultiple( urls ) {
		return new Promise( ( resolve, reject ) => {
			var promises = urls.map( url => {
				return this.load( url );
			});

			Promise.all( promises ).then( results => {
				var resultsByURL = {};
				results.forEach( result => { resultsByURL[ result.url ] = result.scene; } );
				resolve( resultsByURL );
			});
		});
	}
}

export let GLTFLoader = new StaticGLTFLoader();