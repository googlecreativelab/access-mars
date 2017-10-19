/**
 * Modified from https://github.com/Flafla2/Vive-Teleporter
 */

const UP_VECTOR = new THREE.Vector3( 0, 1, 0 );
const RAD_45 = Math.PI / 4;

const BezierEasing = require( 'bezier-easing' );
const SHOW_EASING = BezierEasing( 0.66, 0, 0.33, 1 );

export class ParabolicPointer {

	constructor() {
		this.velocityFwd = new THREE.Vector3();
		this.vectorRight = new THREE.Vector3();
		this.vectorCross = new THREE.Vector3();
		this.tempVectorA = new THREE.Vector3();
		this.normal = new THREE.Vector3();
		this.deriv = new THREE.Vector3();
		this.next = new THREE.Vector3();
		this.last = new THREE.Vector3();
		this.hit = new THREE.Vector3();

		this.raycaster = new THREE.Raycaster();
		this.direction = new THREE.Vector3();
	}

	parabola1D( p, v, a, t ) {
		return p + v * t + 0.5 * a * t * t;
	}

	parabolaDeriv1D( v, a, t ) {
		return v + a * t;
	}

	parabola3D( p, v, a, t, result ) {
		result = result || new THREE.Vector3();
		result.x = this.parabola1D( p.x, v.x, a.x, t );
		result.y = this.parabola1D( p.y, v.y, a.y, t );
		result.z = this.parabola1D( p.z, v.z, a.z, t );
		return result;
	}

	parabolaDeriv3D( v, a, t, result ) {
		result = result || new THREE.Vector3();
		result.x = this.parabolaDeriv1D( v.x, a.x, t );
		result.y = this.parabolaDeriv1D( v.y, a.y, t );
		result.z = this.parabolaDeriv1D( v.z, a.z, t );
		return result;
	}

	getInitialVelocity1D( th, y, a, x ) {
		// var yxtan = y - x * Math.tan( th );
		// var b = x * Math.sqrt( -a * yxtan );
		// var c = Math.sqrt( 2 ) * Math.cos( th ) * yxtan;
		// return b / c;
		// var b = 0.5 * a * d * d;
		// var c = d * Math.tan( th ) + y;
		// return ( 1 / Math.cos( th ) ) * Math.sqrt( b / c );
		var ct = Math.cos( th );
		var st = Math.sin( th );
		var b = 2 * y * a * ct * ct;
		var c = 2 * a * x * ct * st;
		return ( a * x ) / Math.sqrt( Math.abs( b + c ) );
	}

	calcCurve( start, end, pts ) {
		pts.push( start.clone() );
		
		var midpoint = new THREE.Vector3();
		var d = start.distanceTo( end );
		var y = 0.2 + d / 35;
		var ease = BezierEasing( 0, 0, 1 - Math.min( d / 35, 0.7 ), 1 );

		for ( let i = 0, t = 0; i < 50; i++ ) {
			t = i / 50;
			midpoint.lerpVectors( start, end, t );
			midpoint.y += Math.sin( ease( t ) * Math.PI ) * y;
			pts.push( midpoint.clone() );
		}
	}

	calcParabolicCurve( p, v, a, dist, n, mesh, pts ) {
		pts.push( p.clone() );

		this.last.copy( p );

		for ( let i = 0, t = 0; i < n; i++ ) {
			this.parabolaDeriv3D( v, a, t, this.deriv );
			t += dist / this.deriv.length();
			this.parabola3D( p, v, a, t, this.next );

			this.direction.subVectors( this.next, this.last );
			this.direction.normalize();

			this.raycaster.far = this.next.distanceTo( this.last );
			this.raycaster.set( this.last, this.direction );

			var intersections = this.raycaster.intersectObject( mesh, true );

			if ( intersections.length ) {
				var intersection = intersections[ 0 ];
				pts.push( intersection.point.clone() );
				return intersection;
			} else {
				pts.push( this.next.clone() );
			}

			this.last.copy( this.next );
		}

		return null;
	}

	calcParabolaParameters( velocity ) {
		this.velocityFwd.copy( velocity );
		this.velocityFwd.projectOnPlane( UP_VECTOR );

		var angle = this.velocityFwd.angleTo( velocity );

		this.vectorRight.crossVectors( UP_VECTOR, this.velocityFwd );
		this.vectorCross.crossVectors( this.velocityFwd, velocity );

		if ( this.vectorRight.dot( this.vectorCross ) > 0 ) {
			angle *= -1;
		}

		return angle;
	}
}