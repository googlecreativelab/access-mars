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
 * CardMeshImage
 *
 * Same as CardMesh, except it can load and display an image.
 */

import { BGColor } from '../core/colors';
import { CardMesh } from './card-mesh';

export class CardMeshImage extends CardMesh {

	constructor( width, height, imageURL, depthTest ) {
		super( width, height, depthTest );

		this.material.uniforms.color.value = BGColor;
		
		this.textureLoader = new THREE.TextureLoader();

		if ( imageURL ) {
			this.loadImage( imageURL );
		}
	}

	/**
	 * Loads and displays an image at a given URL.
	 * Returns a promise which resolves when the image is loaded.
	 */
	loadImage( imageURL ) {
		return new Promise( ( resolve, reject ) => {
			this.textureLoader.load( 'img/' + imageURL, texture => {
				this.texture = texture;
				this.texture.minFilter = THREE.LinearMipMapNearestFilter;

				// Set image texture
				this.material.uniforms.map.value = this.texture;
				this.material.uniforms.color.value = new THREE.Color( 0 );
				this.material.needsUpdate = true;

				resolve();
			});	
		});
	}

	/**
	 * Unloads the card image and resets the material color.
	 */
	unloadImage() {
		this.material.uniforms.color.value = BGColor;
		this.material.uniforms.map.value = null;
		this.material.needsUpdate = true;
		this.texture = null;
	}
}