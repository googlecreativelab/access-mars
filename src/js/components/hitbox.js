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
 * hitbox
 *
 * A box collision component which acts as a single mesh
 * for hit-testing against scene elements with multiple
 * children. This simplifies collision detection, as an
 * element will only need to listen for collision events
 * from its hitbox, rather than from each of its child
 * elements.
 *
 * The size of the box is calculated from the bounding box
 * of the element it is attached to, with an added expansion
 * parameter.
 *
 * The box can also change the controller-dot color and size
 * on intersection. TODO: maybe a separate component should
 * do this.
 */

const HITBOX_GEOMETRY = new THREE.PlaneBufferGeometry( 1, 1 );
// const HITBOX_MATERIAL = new THREE.MeshBasicMaterial( { color: 0xFF00FF, side: THREE.DoubleSide, transparent: true, opacity: 0.25 } );
const HITBOX_MATERIAL = new THREE.MeshBasicMaterial( { side: THREE.DoubleSide, visible: false } );

import { TextColorHex, TextColor, WhiteColor } from '../core/colors';
import { Scene } from '../core/scene';
import { PlatformUtils } from '../utils/platform-utils';

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'hitbox', {

		dependencies: [ 'event-priority' ],

		schema: {
			expansion: { default: 20 },
			cursorScale: { default: 1 },
			desktopCursorPointer: { default: true }
		},

		init: function() {

			this.el.classList.add( 'clickable' );
			this.el.setAttribute( 'consume-click', '' );

			// Route intersection events to their functions
			this.el.addEventListener( 'raycaster-intersected', this.onIntersect.bind( this ) );
			this.el.addEventListener( 'raycaster-intersected-cleared', this.onIntersectionCleared.bind( this ) );

			// Update the bounding box if any children are added to the parent element
			this.el.addEventListener( 'child-attached', this.updateBoundingBox.bind( this ) );
			this.el.addEventListener( 'child-detached', this.updateBoundingBox.bind( this ) );

			this.cursor = document.getElementById( 'controller-dot' );
		},

		/**
		 * Calculate the new box scale from the parent element's bounding box
		 */
		updateBoundingBox: function() {
			// Calculate the new box scale from the parent element's bounding box
			this.resizeToThis( this.el.parentNode );
		},

		resizeToThis: function( el ) {
			const obj = el.getObject3D( 'mesh' );
			if ( !obj ) return;
			this.bounds = new THREE.Box3().setFromObject( obj );
			this.bounds.expandByScalar( this.data.expansion );
			this.updateHitboxMesh();
		},

		updateHitboxMesh: function() {
			this.mesh = new THREE.Mesh( HITBOX_GEOMETRY, HITBOX_MATERIAL );
			this.mesh.position.copy( this.bounds.getCenter() );
			this.mesh.position.setZ( this.mesh.position.z + 0.02 );
			this.mesh.scale.copy( this.bounds.getSize() );
			this.mesh.scale.setZ( 1 );

			this.el.setObject3D( 'mesh', this.mesh );

			// raycaster usually updates when hittests are added
			// doesn't work on certain objects like info-card
			Scene.emit( 'force-added', null, false );
		},

		update: function() {
			this.updateBoundingBox();
		},

		onIntersect: function() {
			if ( this.data.desktopCursorPointer ) {
				document.body.classList.add( 'pointer' );
			}

			if ( !this.cursor ) return;
			this.cursor.setAttribute( 'controller-dot', {
				color: TextColor,
				scale: this.data.cursorScale
			});
		},

		onIntersectionCleared: function() {
			document.body.classList.remove( 'pointer' );
			this.cursor.setAttribute( 'controller-dot', {
				color: WhiteColor,
				scale: 1
			});
		},

		remove: function() {
			this.el.removeObject3D( 'mesh' );
			document.body.classList.remove( 'pointer' );
			this.cursor.removeAttribute( 'controller-dot', 'color' );
			this.cursor.removeAttribute( 'controller-dot', 'scale' );
		}
	});
}
