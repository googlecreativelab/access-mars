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
 * info-card
 *
 * UI component for displaying the info cards which are shown
 * when the user clicks on a point-of-interest.
 *
 * Only one card exists in the scene, and its contents change
 * depending on which point-of-interest has been selected.
 *
 * The card can contain an image, a title, and body copy.
 * Size of the card is calculated automatically from the text
 * it needs to contain.
 *
 * The card will position itself towards the camera when shown.
 */

import { TextColor } from '../core/colors';
import { Scene } from '../core/scene';
import { PlatformUtils } from '../utils/platform-utils';
import { CardMesh } from '../meshes/card-mesh';
import { CardMeshImage } from '../meshes/card-mesh-image';

const MARGIN = 0.075;

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'info-card', {

		dependencies: [ 'visible', 'look-at-target' ],

		schema: {
			url: { type: 'string' },
			width: { type: 'number', default: 1 },
			title: { type: 'string' },
			type: { type: 'string', default: 'poi'},
			text: { type: 'string' },
			index: { type: 'string', default: '' },
			poi: { type: 'selector' }
		},

		init: function() {
			this.headerTextSize = new THREE.Vector2();
			this.bodyTextSize = new THREE.Vector2();
			this.indexTextSize = new THREE.Vector2();

			this.positionDummy = document.getElementById( 'ui-dummy' );
			this.camera = document.getElementById( 'camera' );
			this.player = document.getElementById( 'player' );

			// Set up look-at-target component so that the card faces the camera directly.
			this.el.setAttribute( 'look-at-target', {
				axis: 'xyz',
				target: '#camera',
				alwaysUpdate: false,
				offset: new THREE.Vector3( 0, Math.PI, 0 )
			});

			// This group is used to hold the various meshes that aren't represented
			// by separate entity DOM elements. This includes the background plane,
			// the image plane, and the close + divider icons.
			this.group = new THREE.Group();
			this.el.setObject3D( 'mesh', this.group );

			// Creat the header text entity
			this.textHeader = document.createElement( 'a-entity' );
			this.textHeader.setAttribute( 'info-card-text', 'font', 'fonts/NowAlt-Bold.json' );
			this.textHeader.setAttribute( 'info-card-text', 'letterSpacing', 12 );
			this.textHeader.setAttribute( 'info-card-text', 'wrapCount', 28 );

			// Thicken up the body text on mobile so that it's easier to read
			const bodyFontWeight = AFRAME.utils.device.isMobile() ? 'Bold' : 'Medium';

			// Create the body copy entity
			this.textBody = document.createElement( 'a-entity' );
			this.textBody.setAttribute( 'info-card-text', 'font', 'fonts/NowAlt-Medium.json' );
			this.textBody.setAttribute( 'info-card-text', 'wrapCount', 32 );

			// Create the index number text entity
			this.textIndex = document.createElement( 'a-entity' );
			this.textIndex.setAttribute( 'info-card-text', 'font', 'fonts/NowAlt-Bold.json' );
			this.textIndex.setAttribute( 'info-card-text', 'wrapCount', 7 );

			// Create the background card mesh
			this.background = new CardMesh( this.data.width );
			this.background.setPosition( -0.5, 0 );

			// Create the image card mesh
			this.image = new CardMeshImage( this.data.width );
			this.image.setPosition( 0.5, 0 );
			this.image.setDepth( 0.001 );

			// Create the close icon mesh
			this.closeIcon = new CardMeshImage( 0.05, 0.05, 'cards/closeIcon.jpg' );
			this.closeIcon.setDepth( 0.001 );

			// Create the dividing line squiggle mesh
			this.divider = new CardMeshImage( 0.09, 0.02, 'cards/squiggle.jpg' );
			this.divider.setDepth( 0.001 );

			// Create the hitbox
			this.hitbox = document.createElement( 'a-entity' );
			this.hitbox.setAttribute( 'event-priority', 10 );
			this.hitbox.setAttribute( 'hitbox', {
				expansion: 20,
				cursorScale: 0.4
			});

			// Add 'em up
			this.el.appendChild( this.textHeader );
			this.el.appendChild( this.textBody );
			this.el.appendChild( this.textIndex );
			this.el.appendChild( this.hitbox );
			this.group.add( this.background.mesh );
			this.group.add( this.image.mesh );
			this.group.add( this.closeIcon.mesh );
			this.group.add( this.divider.mesh );

			// Close the card if the user clicks on it
			this.el.addEventListener( 'raycaster-cursor-up', event => {
				ga( 'send', 'event', 'info-card', 'dismissed', '' );
				this.el.removeState( 'visible' );
			});

			// Show everything when the 'visible' state is added
			this.el.addEventListener( 'stateadded', event => {
				if ( event.detail.state !== 'visible' ) return;

				// Send analytics
				if ( event.target.id === 'info-card' ) {
					const prefix = this.data.type === 'rover' ? 'rover-' : 'poi-';
					ga( 'send', 'event', 'info-card', 'opened',
						Scene.currentSite + '/' + prefix + this.data.title.replace( /\s/g, '' ) );
				}

				this.el.sceneEl.addState( 'modal' );
				this.textHeader.addState( 'visible' );
				this.textBody.addState( 'visible' );
				this.textIndex.addState( 'visible' );

				this.closeIcon.show();
				this.divider.show( 0.25, 0.2 );
				this.background.show();
				this.image.show();
			});

			// Hide everything when the 'visible' state is removed
			this.el.addEventListener( 'stateremoved', event => {
				if ( event.detail.state !== 'visible' ) return;

				this.el.sceneEl.removeState( 'modal' );
				this.textHeader.removeState( 'visible' );
				this.textBody.removeState( 'visible' );
				this.textIndex.removeState( 'visible' );

				this.closeIcon.hide();
				this.divider.hide( 0.15 );
				this.background.hide();
				this.image.hide();
			});

			// Bubble the hide-complete event from the background mesh up thru the entity element.
			this.background.on( 'hide-complete', event => {
				this.el.emit( 'hide-complete', null, false );
			});

			// Update header text size + entity positions when the header text's text geometry is updated.
			this.textHeader.addEventListener( 'geometry-updated', event => {
				this.headerTextSize.set( event.detail.width, event.detail.height );
				this.updateElements();
			});

			// Update body copy size + entity positions when the body copy's text geometry is updated.
			this.textBody.addEventListener( 'geometry-updated', event => {
				this.bodyTextSize.set( event.detail.width, event.detail.height );
				this.updateElements();
			});

			// Update index number text size + entity positions when the index number text's geometry is updated.
			this.textIndex.addEventListener( 'geometry-updated', event => {
				this.indexTextSize.set( event.detail.width, event.detail.height );
				this.updateElements();
			});
		},

		update: function() {
			
			// Apply platform-specific z offset
			this.positionDummy.setAttribute( 'position', {
				x: 0, y: 0, z: PlatformUtils.getCardZOffset()
			});

			// Update position and look-at rotation to match the current camera location
			const uiPosition = this.positionDummy.object3D.getWorldPosition();
			this.el.setAttribute( 'position', { x: uiPosition.x, y: uiPosition.y, z: uiPosition.z });
			this.el.components[ 'look-at-target' ].update();

			// Unload the previous image
			this.image.unloadImage();

			// Load the new image
			if ( this.data.url ) {
				this.image.loadImage( this.data.url ).then( () => {
					this.el.emit( 'load-complete', null, false );
				});
			}

			// Set text contents
			this.textHeader.setAttribute( 'info-card-text', {
				value: this.data.title.toUpperCase()
			});

			this.textBody.setAttribute( 'info-card-text', {
				value: this.data.text
			});

			this.textIndex.setAttribute( 'info-card-text', {
				value: this.data.type === 'rover' ? '' : '0' + this.data.index
			});
		},

		tick: function( t, dt ) {
			this.closeIcon.tick( dt );
			this.divider.tick( dt );
			this.background.tick( dt );
			this.image.tick( dt );

			this.el.setAttribute( 'visible', this.background.animIn > 0 );
		},

		updateElements: function() {
			const margin = MARGIN * this.data.width;

			// Set X icon position
			this.closeIcon.setPosition(
				-1.0 + this.closeIcon.mesh.scale.x / 2 + margin,
				 0.5 - this.closeIcon.mesh.scale.x / 2 - margin
			);

			// Set body copy position
			this.textBody.setAttribute( 'position', {
				x: -this.data.width + MARGIN,
				y: -0.5 + Math.abs( this.bodyTextSize.y ) + 0.02
			});

			// Set index position
			this.textIndex.setAttribute( 'position', {
				x: -Math.abs( this.indexTextSize.x ) - margin / 2,
				y: 0.5 - Math.abs( this.indexTextSize.y ) - margin / 2
			});

			// Set squiggle position
			this.divider.setPosition(
				-1 + this.divider.mesh.scale.x / 2 + margin,
				this.textBody.getAttribute( 'position' ).y + this.divider.mesh.scale.y / 2 + margin
			);

			// Set header position
			this.textHeader.setAttribute( 'position', {
				x: -this.data.width + MARGIN,
				y: this.divider.mesh.position.y + Math.abs( this.headerTextSize.y )
			});
		}
	});
}
