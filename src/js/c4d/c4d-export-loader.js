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
 * C4DExportLoader
 *
 * Class which loads GLTF files exported from Cinema4D and handles
 * per-object metadata added by the COLLADA Export Plus plugin within
 * Cinema4D.
 *
 * (Cinema4D exports COLLADA files, but these are converted to GLTF using 
 * COLLADA2GLTF)
 */

import { GLTFLoader } from '../loaders/gltf-loader';
import { C4DMetadata } from './c4d-metadata';

export class C4DExportLoader {

	/**
	 * Loads a given GLTF scene file exported from Cinema4D. 
	 * Each node of the scene is checked for metadata in the node name,
	 * and any metadata that is found is evaluated. This includes things
	 * like shader settings, loading xrefs, etc.
	 *
	 * Returns a promise which resolves when the scene setup is complete.
	 */
	load( src, xrefPath, texPath ) {
		return new Promise( ( resolve, reject ) => {
		
			GLTFLoader.load( src ).then( data => {

				var promises = [];

				data.gltf.scene.traverse( node => {
					if ( node.name.length === 0 ) node.name = node.uuid;
					promises.push( new C4DMetadata( xrefPath, texPath ).parse( node ) );
				});

				Promise.all( promises ).then( results => {

					var linkObjects = [];
					var hitboxes = [];
					
					results.filter( metadata => metadata !== null ).forEach( metadata => {
						
						if ( metadata.linkObject ) {
							linkObjects.push( metadata.linkObject );
						}	

						if ( metadata.hitbox ) {
							hitboxes.push({
								node: metadata.object,
								name: metadata.hitbox,
								target: metadata.target
							});
						}
					});

					resolve({
						scene: data.gltf.scene, 
						animations: data.gltf.animations,
						linkObjects: linkObjects,
						hitboxes: hitboxes
					});
				});

			}).catch( error => {
				console.error( error );
				reject( error );
			}) ;
		});
	}
}
