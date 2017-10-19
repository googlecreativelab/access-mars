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
 * CommonTex
 *
 * Singleton loader and cache container for a few common textures used by
 * the terrain component.
 */

class StaticCommonTex {

	constructor() {
		this.textures = {};
		this.textureURLs = {
			grid: 'img/grid.png', 
			triangles: 'img/triangles.png'
		};

		this.isLoaded = false;
	}

	load() {
		return new Promise( ( resolve, reject ) => {
			
			if ( this.isLoaded ) return resolve();

			const promises = Object.keys( this.textureURLs ).map( key => {
				return loadTexture( key, this.textureURLs[ key ] );
			});

			Promise.all( promises ).then( results => {
				results.forEach( result => {
					this.textures[ result.name ] = result.texture;
				});
				
				this.isLoaded = true;
				resolve();
			});
		});
	}
}

function loadTexture( name, url ) {
	return new Promise( ( resolve, reject ) => {
		const loader = new THREE.TextureLoader();
		loader.load( url, texture => {
			resolve({
				name: name,
				texture: texture 
			});
		});
	});
}

export let CommonTex = new StaticCommonTex();