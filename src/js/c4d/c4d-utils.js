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
 * C4DUtils
 *
 * Singleton class containing various utility functions used by the 
 * Cinema4D scene animation / management system.
 */

import { METADATA_TAG, GetMetadataFromName } from './c4d-metadata';

class StaticC4DUtils {

	/**
	 * Returns an object's name, stripped of metadata
	 */
	getShortName( obj ) {
		var name = obj;
		if ( typeof obj !== 'string' ) name = obj.name;
		if ( !name.includes( METADATA_TAG ) ) return name;
		return name.split( METADATA_TAG ).shift();
	}

	/**
	 * Searches a given object's children and returns the first object which
	 * matches a given short name
	 */
	getObjectByShortName( searchObject, name ) {

		if ( this.getShortName( searchObject ) === name ) return searchObject;

		for ( var i = 0, l = searchObject.children.length; i < l; i++ ) {
			const child = searchObject.children[ i ];
			const object = this.getObjectByShortName( child, name );

			if ( object !== undefined ) return object;
		}

		return undefined;
	}

	/**
	 * Searches a given object's hierarchy and returns the first child 
	 * which matches a given type
	 */
	getChildWithType( searchObject, type ) {
		if ( !searchObject ) return null;
		if ( searchObject.type === type ) return searchObject;

		for ( var i = 0, l = searchObject.children.length; i < l; i++ ) {
			const child = searchObject.children[ i ];
			const object = this.getChildWithType( child, type );

			if ( object !== undefined ) return object;
		}

		return undefined;
	}

	/**
	 * Returns a directory-style path string leading from a given
	 * parent object to a given target object.
	 */
	getStringPathFromParent( target, parent, path ) {

		var pathToString = () => {
			var result = '';
			path.reverse();
			path.shift();
			path.forEach( entry => result += '/' + entry );
			return result;
		}

		if ( path === undefined ) path = [ target.name ];
		if ( target === parent ) return pathToString();
		if ( !target.parent ) return pathToString();

		path.push( target.parent.name );

		return this.getStringPathFromParent( target.parent, parent, path );
	}

	/**
	 * Searches a given array of AnimationClip objects and returns all clips
	 * that have keyframe tracks for a given object.
	 */
	findAnimationClipsForObject( clips, obj ) {
		const name = this.getShortName( obj );

		return clips.filter( clip => {
				
			for ( let i = 0, l = clip.tracks.length; i < l; i++ ) {

				const track = clip.tracks[ i ];
				const trackObjectName = track.name.slice( 0, track.name.lastIndexOf( '.' ) );
				const trackMetadata = GetMetadataFromName( trackObjectName );

				if ( trackMetadata.shaderLinkTarget === name ) return true;
			}

			return false;
		});
	}
}

export let C4DUtils = new StaticC4DUtils();