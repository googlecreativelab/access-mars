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
 * TileManager
 *
 * Manager for loading progressively-higher-res terrain tile textures.
 *
 * Terrain tile texture load order is determined by distance from the
 * player. The closest tiles load first. The load order is updated
 * whenever the player moves.
 */

export class TileManager {

	constructor( tiles ) {
		this.tiles = Array.from( tiles );
		this.size = 0;

		// Do initial tile sort by center distance from (0, 0, 0) outwards
		this.tiles = this.tiles.sort( (a, b ) => {
			return a.center.lengthSq() - b.center.lengthSq();
		});

		// Set up initial tile list for pending texture updates
		this.tilesForTextureUpdate = Array.from( this.tiles );

		// Start the update loop
		this.updateNextTile();
	}

	updateNextTile() {
		this.currentlyUpdatingTile = this.tilesForTextureUpdate.shift();

		if ( this.currentlyUpdatingTile !== undefined ) {

			this.currentlyUpdatingTile.loadNextTextureSize().then( response => {
				// console.log( this.currentlyUpdatingTile.id, response );
				this.updateNextTile();
			}, error => {
				// console.log( this.currentlyUpdatingTile.id, error );
				this.updateNextTile();
			});

		} else if ( ++this.size < 2 ) {
			// If the largest size hasn't been reached yet, reset the list and load
			// the next size up.
		 	this.reset();
		}
	}

	/**
	 * Sort the tile update order by proximity to the given THREE.Vector3.
	 * Closer tiles will get updated first.
	 */
	updatePlayerPosition( pos ) {
		this.tilesForTextureUpdate.sort( ( a, b ) => {
			const da = pos.distanceToSquared( a.center );
			const db = pos.distanceToSquared( b.center );
			return da - db;
		});
	}

	/**
	 * Resets the tile update list and starts a new update cycle.
	 * Used for updating all tiles to the next size value.
	 */
	reset() {
		this.tilesForTextureUpdate = Array.from( this.tiles );
		this.updateNextTile();
	}

	/**
	 * Clears the tile update list.
	 */
	unload() {
		this.currentlyUpdatingTile = null;
		this.tilesForTextureUpdate = [];
		this.tiles = [];
	}
}
