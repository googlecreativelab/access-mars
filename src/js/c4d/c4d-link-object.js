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
 * C4DLinkObject
 *
 * Class for handling the linking of animated properties between objects.
 * 
 * Because many animatable properties cannot be exported directly from
 * Cinema4D, these properties are represented instead by null objects. 
 * The world-space x position of the null object is then animated and
 * exported, and this class links that animation to the property
 * specified in the object's metadata information.
 */

import { C4DUtils } from './c4d-utils';
import { GetMetadataFromName } from './c4d-metadata';

const cloneDeep = require( 'clone-deep' );
 
export class C4DLinkObject {

	constructor( obj ) {
		this.object = obj;
		this.linkTargetName = this.object.metadata.shaderLinkTarget;
		this.linkUniformName = this.object.metadata.shaderLinkUniform;
		this.linkTransformName = this.object.metadata.transformLink;
		this.linkClip = null;
	}

	/**
	 * Finds and sets this link object's target object in a given scene
	 */
	setLinkTargetFromScene( scene ) {
		 this.linkTarget = C4DUtils.getObjectByShortName( scene, this.linkTargetName );
		 this.meshTarget = C4DUtils.getChildWithType( this.linkTarget, 'Mesh' );
	}

	/**
	 * Finds and sets this link object's source animation clip in a given array 
	 * of AnimationClips
	 */
	setSourceClipFromClipArray( clips ) {
		if ( !this.linkTarget ) return;

		// Find all animation clips which use the linkTarget object
		const targetClips = C4DUtils.findAnimationClipsForObject( clips, this.linkTarget );

		// Find the one clip that has the property that matches linkUniformName.
		// Only supports the first track, for now.
		this.sourceClip = targetClips.find( clip => {
			const track = clip.tracks[ 0 ];
			const trackObjectName = track.name.slice( 0, track.name.lastIndexOf( '.' ) );
			const trackMetadata = GetMetadataFromName( trackObjectName );

			return trackMetadata.shaderLinkUniform === this.linkUniformName;
		});
	}

	/**
	 * Returns a copy of a given source AnimationClip, modified to directly animate
	 * the linked object's shader uniform.
	 */
	getLinkedAnimationClip( sourceClip ) {
		if ( !this.linkTarget ) return null;
		if ( !this.sourceClip ) return null;
		if ( !this.meshTarget ) return null;
		if ( this.linkClip ) return this.linkClip;

		// Start with a clone of the original source clip. It will be modified to reflect
		// the changes required to match the animation of the linked shader uniform.
		this.linkClip = cloneDeep( this.sourceClip );

		if ( this.linkClip.tracks.length > 1 ) {
			console.warn( 'This clip has more than one track. Only the first track will be used.' );
		}

		if ( this.linkClip.tracks[ 0 ].ValueTypeName !== 'vector' ) {
			console.error( 'Currently, only tracks of type VectorKeyframeTrack are supported.' );
			return;
		}

		// Overwrite the old track in the new clip
		if ( this.linkUniformName ) {
			this.linkClip.tracks[ 0 ] = this.constructUniformTrack();
		} else {
			this.linkClip.tracks[ 0 ] = this.constructTransformTrack();
		}

		// Adjust name of the new clip so it doesn't collide with the source clip
		this.linkClip.name += '_linked';

		return this.linkClip;
	}

	constructUniformTrack() {
		// Get the string path between the target mesh object and the target linked object
		const meshTargetPath = C4DUtils.getStringPathFromParent( this.meshTarget, this.linkTarget );

		// Link a new property on the target mesh to the corresponding shader uniform. The shader uniforms
		// cannot be directly targeted by the threejs animation system, but it can target properties
		// of mesh objects. 
		// 
		// See: https://github.com/mrdoob/three.js/issues/12202
		const meshLinkedPropertyName = 'linkedUniform_' + this.linkUniformName;
		this.meshTarget[ meshLinkedPropertyName ] = this.meshTarget.material.uniforms[ this.linkUniformName ];
		
		// Construct a new track path name so that the track will animate the mesh's property which is
		// linked to the correct shader uniform.
		const shaderUniformPath = meshTargetPath + '.' + meshLinkedPropertyName + '[value]';
		const trackName = this.linkTarget.name + shaderUniformPath;

		// Copy the rest of the track properties directly
		const trackTimes = cloneDeep( this.linkClip.tracks[ 0 ].times );
		const trackInterpolation = this.linkClip.tracks[ 0 ].getInterpolation();

		// The x coordinate is used for the animated value in the original track. Copy
		// just that coordinate to a new value array. It is the first value of every 3-tuple
		// in the values array.
		const trackValues = this.linkClip.tracks[ 0 ].values.filter( ( n, i ) => {
			return i % 3 === 0;
		});

		// Construct a new NumberKeyframeTrack using the values and timings modified above
		return new THREE.NumberKeyframeTrack( trackName, trackTimes, trackValues, trackInterpolation );
	}

	constructTransformTrack() {
		// Construct a new track path name so that the track will animate the target transform parameter
		const trackName = this.linkTarget.name + '.' + this.linkTransformName;

		// Copy the rest of the track properties directly
		const trackValues = cloneDeep( this.linkClip.tracks[ 0 ].values );
		const trackTimes = cloneDeep( this.linkClip.tracks[ 0 ].times );
		const trackInterpolation = this.linkClip.tracks[ 0 ].getInterpolation();

		// Construct a new VectorKeyframeTrack using the values and timings modified above
		return new THREE.VectorKeyframeTrack( trackName, trackTimes, trackValues, trackInterpolation );
	}
}
