// Copyright 2017 Google Inc.
//
//   Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
////   Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
// limitations under the License.


/**
 * map-card
 *
 * UI component for displaying the map teleportation interface when
 * the user clicks on the horizon marker.
 *
 * The card will position itself towards the camera when shown.
 */

import { CardMeshImage } from '../meshes/card-mesh-image';
import { TextColorHex } from '../core/colors';

const MARGIN = 0.075;
const IMAGE_ASPECT_RATIO = ( 1 / 1.2 );

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'orientation-card-column', {

		dependencies: [ 'visible' ],

		schema: {
			title: { type: 'string' },
			img: { type: 'string' },
			text: { type: 'string' },
			width: { type: 'number', default: 2 * ( 1 / 3 ) }
		},

		init: function() {
			this.index = Array.from( this.el.parentNode.children ).indexOf( this.el ) - 1;

			this.group = new THREE.Group();
			this.el.setObject3D( 'mesh', this.group );

			// Create the image mesh
			this.imageMesh = new CardMeshImage( 1, 1, 'cards/' + this.data.img + '.jpg' );
			this.imageMesh.setDepth( 0.001 );

			// Create the squiggle divider mesh
			this.divider = new CardMeshImage( 0.07, 0.025, 'cards/squiggle.jpg' );
			this.divider.setDepth( 0.001 );

			// Create the title text entity
			this.headerText = document.createElement( 'a-entity' );
			this.headerText.setAttribute( 'info-card-text', {
				color: TextColorHex,
				font: 'fonts/NowAlt-Bold.json',
				letterSpacing: 12,
				value: this.data.title.toUpperCase(),
				width: this.data.width - MARGIN,
				wrapCount: 18
			});

			// Create the body text entity
			this.bodyText = document.createElement( 'a-entity' );
			this.bodyText.setAttribute( 'info-card-text', {
				color: TextColorHex,
				font: 'fonts/NowAlt-Medium.json',
				letterSpacing: 6,
				lineHeight: 90,
				value: this.data.text,
				width: this.data.width - MARGIN * 2,
				wrapCount: 26
			});

			// Add 'em up
			this.group.add( this.imageMesh.mesh );
			this.group.add( this.divider.mesh );
			this.el.appendChild( this.headerText );
			this.el.appendChild( this.bodyText );

			this.el.parentNode.addEventListener( 'stateadded', event => {
				if ( event.detail.state === 'visible' ) this.onShow();
			});

			this.el.parentNode.addEventListener( 'stateremoved', event => {
				if ( event.detail.state === 'visible' ) this.onHide();
			});
		},

		update: function() {
			const parentWidth = this.el.parentNode.getAttribute( 'orientation-card' ).width;
			const parentHeight = this.el.parentNode.getAttribute( 'orientation-card' ).height;

			const startX = parentWidth / -2;
			const columnWidth = parentWidth / 3;
			const imageWidth = columnWidth - MARGIN * 2;
			const imageHeight = imageWidth * IMAGE_ASPECT_RATIO;
			const halfImageHeight = imageHeight / 2;
			const headerHeight = 0.05;

			// Set the parent element's position
			this.el.setAttribute( 'position', {
				x: startX + columnWidth  * this.index,
				y: 0,
				z: 0
			});

			// Set the image mesh's size
			this.imageMesh.setSize( imageWidth, imageHeight );

			// Set the image mesh's position
			this.imageMesh.setPosition( 
				imageWidth / 2 + MARGIN, 
				parentHeight / 2 - halfImageHeight - MARGIN
			);
			
			const textStartY = this.imageMesh.getY() - halfImageHeight - headerHeight - MARGIN;

			// Set the divider mesh's position
			this.divider.setPosition( MARGIN + 0.03 + 0.007, textStartY - 0.015 - 0.02 );

			// Set the header text's position
			this.headerText.setAttribute( 'position', {
				x: MARGIN,
				y: textStartY,
				z: 0
			});

			// Set the body text's position
			this.bodyText.setAttribute( 'position', {
				x: MARGIN,
				y: textStartY - 0.04 - MARGIN,
				z: 0
			});
		},

		onShow: function() {
			this.headerText.addState( 'visible' );
			this.bodyText.addState( 'visible' );
			this.imageMesh.show( 0.15, 0.1 );
			this.divider.show( 0.05, 0.25 );
		},

		onHide: function() {
			this.headerText.removeState( 'visible' );
			this.bodyText.removeState( 'visible' );
			this.imageMesh.hide( 0.15, 0.1 );
			this.divider.hide( 0.05 );
		},

		tick: function( t, dt ) {
			this.imageMesh.tick( dt );
			this.divider.tick( dt );
		}
	});
}
