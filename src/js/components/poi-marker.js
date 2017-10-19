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
 * poi-marker
 *
 * Point-of-interest marker. Placed in the scene at certain locations.
 *
 * Clicking on one will open the info-card and populate it with the text
 * and image specified in the attributes.
 */

import { Scene } from '../core/scene';
import { TextColor } from '../core/colors';
import { AudioManager } from '../core/audio-manager';

const MARKER_DIAMETER = 30;
const FLAG_Y_OFFSET = 100;
const FLAG_Y_CENTER = FLAG_Y_OFFSET + MARKER_DIAMETER / 2;

export const POIAnimInDelay = 0.5;

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'poi-marker', {

		dependencies: [ 'visible' ],

		schema: {
			label: { type: 'string' },
			img: { type: 'string' },
			vo: { type: 'string' },
			title: { type: 'string' },
			text: { type: 'string' },
			size: { type: 'number', default: 0.03 }
		},

		init: function() {
			// Get the site name from the parent node's ID
			this.site = this.el.parentNode.id.split( '_markers' )[ 0 ];

			this.titleOpacity = 0;
			this.updateTitleOpacity = false;
			this.isIntersected = false;

			this.camera = document.getElementById( 'camera' );

			this.el.addState( 'interactive' );

			this.group = new THREE.Group();
			this.el.setObject3D( 'mesh', this.group );

			this.childIndex = Array.from( this.el.parentNode.children ).indexOf( this.el ) + 1;

			// Create spin widget mesh
			this.spinWidget = document.createElement( 'a-entity' );
			this.spinWidget.setAttribute( 'position', new THREE.Vector3( 0, FLAG_Y_CENTER, 0 ) );
			this.spinWidget.setAttribute( 'poi-spin-widget', this.site );
			this.spinWidget.setAttribute( 'scale', { x: MARKER_DIAMETER, y: MARKER_DIAMETER, z: MARKER_DIAMETER } );

			// Create pole mesh
			this.pole = document.createElement( 'a-entity' );
			this.pole.setAttribute( 'position', new THREE.Vector3( 0, FLAG_Y_CENTER, 0 ) );
			this.pole.setAttribute( 'poi-pole', '' );
			this.pole.setAttribute( 'scale', { x: MARKER_DIAMETER, y: MARKER_DIAMETER, z: MARKER_DIAMETER } );

			// Create title label text
			this.titleLabel = document.createElement( 'a-entity' );
			this.titleLabel.setAttribute( 'poi-title-text', {
				value: this.data.title.toUpperCase(),
				yOffset: FLAG_Y_CENTER + MARKER_DIAMETER * 2 + 16
			});

			// Add 'em up
			this.el.appendChild( this.titleLabel );
			this.el.appendChild( this.spinWidget );
			this.el.appendChild( this.pole );
			
			// Wait for the pole element to be loaded before the hitbox is added. 
			// Otherwise, the hitbox will have an incorrect size.
			this.pole.addEventListener( 'load-complete', event => {
				this.group.add( this.pole.object3D );

				this.hitbox = document.createElement( 'a-entity' );
				this.hitbox.setAttribute( 'hitbox', { expansion: 10 } );
				this.hitbox.setAttribute( 'event-priority', 100 );

				this.el.appendChild( this.hitbox );
				this.el.setAttribute( 'scale', new THREE.Vector3( -this.data.size, this.data.size, this.data.size ) );

				// Postpone adding the look-at-target dependency until after the hitbox is generated.
				// Otherwise the hitbox generation will not work properly.
				this.el.setAttribute( 'look-at-target', '' );

				// Now that the hitbox is sized correctly, give the pole meshes back to the pole mesh entity.
				this.pole.emit( 'reassign-meshes', {
					ringMesh: this.pole.ringMesh,
					poleMesh: this.pole.poleMesh
				}, false );
			});

			// Show the pole and spin widget when the scene is done loading
			this.el.sceneEl.addEventListener( 'initial-load-complete', event => {

				// Set the pole and spin widget as visible only when they're within the camera's view frustum.
				// This allows the transition animation to play out so the user can see the POIs being added.
				const onFrustumUpdated = event => {
					if ( event.detail.frustum.containsPoint( this.el.object3D.getWorldPosition() ) ) {
						this.pole.addState( 'visible' );
						this.spinWidget.addState( 'visible' );
						this.camera.removeEventListener( 'frustum-updated', onFrustumUpdated );
					}
				}

				if ( this.el.parentNode.getAttribute( 'visible' ) ) {
					this.camera.addEventListener( 'frustum-updated', onFrustumUpdated );
				} else {
					this.pole.removeState( 'visible' );
					this.spinWidget.removeState( 'visible' );
				}
			});

			this.el.addEventListener( 'raycaster-intersected', this.onIntersect.bind( this ) );
			this.el.addEventListener( 'raycaster-intersected-cleared', this.onIntersectionCleared.bind( this ) );
			this.el.addEventListener( 'raycaster-cursor-up', this.onClick.bind( this ) );
		},

		onClick: function() {
			if ( !this.el.is( 'interactive' ) ) return;
			if ( !this.el.sceneEl.is( 'interactive' ) ) return;

			this.onClickShowCard();
		},

		onIntersect: function( event ) {
			if ( this.isIntersected ) return;
			if ( !this.el.is( 'interactive' ) ) return;
			if ( !this.el.sceneEl.is( 'interactive' ) ) return;

			if ( !this.isIntersected ) {
				AudioManager.playSFX( 'boop' );
			}

			this.isIntersected = true;
			
			this.spinWidget.addState( 'hover' );
			this.el.addState( 'hover' );

			this.titleLabel.setAttribute( 'poi-title-text', { show: true } );
		},

		onIntersectionCleared: function( event ) {
			this.isIntersected = false;

			this.spinWidget.removeState( 'hover' );
			this.el.removeState( 'hover' );

			this.titleLabel.setAttribute( 'poi-title-text', { show: false } );
		},

		onClickShowCard: function() {
			this.el.removeState( 'interactive' );
			this.titleLabel.setAttribute( 'poi-title-text', { show: false } );
			AudioManager.playSFX( 'ui-click' );

			AudioManager.playVO( this.data.vo );

			this.infoCard = document.getElementById( 'info-card' );
			this.infoCard.setAttribute( 'info-card', {
				url: this.data.img,
				title: this.data.title,
				text: this.el.textContent,
				type: 'poi',
				// text: this.data.text,
				index: this.childIndex.toString()
			});
			this.infoCard.addState( 'visible' );
			this.infoCard.components[ 'info-card' ].update(); // forces info card to update even if clicking on the same marker

			// Restore the scene's interactive state when the child info card is hidden
			var onInfoCardHideComplete = event => {
				this.infoCard.removeEventListener( 'hide-complete', onInfoCardHideComplete );
				// this.numberLabel.setAttribute( 'visible', true );
				this.el.addState( 'interactive' );
				AudioManager.stopVO();
			};

			this.infoCard.addEventListener( 'hide-complete', onInfoCardHideComplete );
		}
	});
}
