// Modified to allow animated dashed line rendering

export let MeshLineMaterial = function( parameters ) {

	var vertexShaderSource = [
'precision mediump float;',
'',
'attribute vec3 position;',
'attribute vec3 previous;',
'attribute vec3 next;',
'attribute float side;',
'attribute float width;',
'attribute vec2 uv;',
'attribute float counters;',
'',
'uniform mat4 projectionMatrix;',
'uniform mat4 modelViewMatrix;',
'uniform vec2 resolution;',
'uniform float lineWidth;',
'uniform vec3 color;',
'uniform float opacity;',
'uniform float sizeAttenuation;',
'',
'varying vec2 vUV;',
'varying vec4 vColor;',
'varying float vCounters;',
'',
'vec2 fix( vec4 i, float aspect ) {',
'',
'    vec2 res = i.xy / i.w;',
'    res.x *= aspect;',
'	 vCounters = counters;',
'    return res;',
'',
'}',
'',
'void main() {',
'',
'    float aspect = resolution.x / resolution.y;',
'	 float pixelWidthRatio = 1. / (resolution.x * projectionMatrix[0][0]);',
'',
'    vColor = vec4( color, opacity );',
'    vUV = uv;',
'',
'    mat4 m = projectionMatrix * modelViewMatrix;',
'    vec4 finalPosition = m * vec4( position, 1.0 );',
'    vec4 prevPos = m * vec4( previous, 1.0 );',
'    vec4 nextPos = m * vec4( next, 1.0 );',
'',
'    vec2 currentP = fix( finalPosition, aspect );',
'    vec2 prevP = fix( prevPos, aspect );',
'    vec2 nextP = fix( nextPos, aspect );',
'',
'	 float pixelWidth = finalPosition.w * pixelWidthRatio;',
'    float w = 1.8 * pixelWidth * lineWidth * width;',
'',
'    if( sizeAttenuation == 1. ) {',
'        w = 1.8 * lineWidth * width;',
'    }',
'',
'    vec2 dir;',
'    if( nextP == currentP ) dir = normalize( currentP - prevP );',
'    else if( prevP == currentP ) dir = normalize( nextP - currentP );',
'    else {',
'        vec2 dir1 = normalize( currentP - prevP );',
'        vec2 dir2 = normalize( nextP - currentP );',
'        dir = normalize( dir1 + dir2 );',
'',
'        vec2 perp = vec2( -dir1.y, dir1.x );',
'        vec2 miter = vec2( -dir.y, dir.x );',
'        //w = clamp( w / dot( miter, perp ), 0., 4. * lineWidth * width );',
'',
'    }',
'',
'    vec2 normal = vec2( -dir.y, dir.x );',
'    normal.x /= aspect;',
'    normal *= 0.5 * w;',
'',
'    vec4 offset = vec4( normal * side, 0.0, 1.0 );',
'    finalPosition.xy += offset.xy;',
'',
'    gl_Position = finalPosition;',
'',
'}' ];

	var fragmentShaderSource = [
'#extension GL_OES_standard_derivatives : enable',
'',
'precision mediump float;',
'',
'uniform float visibility;',
'uniform float alphaTest;',
'uniform vec2 repeat;',
'uniform float dashSpacing;',
'uniform float dashSize;',
'uniform vec2 dashAxis;',
'uniform float t;',
'',
'varying vec2 vUV;',
'varying vec4 vColor;',
'varying float vCounters;',
'',
'void main() {',
'',
'    vec4 c = vColor;',
'	 if( c.a < alphaTest ) discard;',

'	 float uv = length( vUV * dashAxis );',
'	 float d = fract( uv * ( 1.0 / dashSpacing ) - t );',
' 	 if ( d < 1.0 - dashSize ) discard;',

'    gl_FragColor = vec4( c.rgb, 1.0 );',
'	 gl_FragColor.a *= step(vCounters,visibility);',
'}' ];

	function check( v, d ) {
		if( v === undefined ) return d;
		return v;
	}

	THREE.Material.call( this );

	parameters = parameters || {};

	this.lineWidth = check( parameters.lineWidth, 1 );
	this.color = check( parameters.color, new THREE.Color( 0xffffff ) );
	this.opacity = check( parameters.opacity, 1 );
	this.resolution = check( parameters.resolution, new THREE.Vector2( 1, 1 ) );
	this.sizeAttenuation = check( parameters.sizeAttenuation, 1 );
	this.visibility = check( parameters.visibility, 1 );
	this.alphaTest = check( parameters.alphaTest, 0 );
	this.repeat = check( parameters.repeat, new THREE.Vector2( 1, 1 ) );
	this.dashSpacing = check( parameters.dashSpacing, 0.05 );
	this.dashSize = check( parameters.dashSize, 0.5 );
	this.dashAxis = check( parameters.dashAxis, new THREE.Vector2( 1, 0 ) );
	this.t = check( parameters.t, 0 );

	var material = new THREE.RawShaderMaterial( {
		uniforms:{
			lineWidth: { type: 'f', value: this.lineWidth },
			color: { type: 'c', value: this.color },
			opacity: { type: 'f', value: this.opacity },
			resolution: { type: 'v2', value: this.resolution },
			sizeAttenuation: { type: 'f', value: this.sizeAttenuation },
			visibility: {type: 'f', value: this.visibility},
			alphaTest: {type: 'f', value: this.alphaTest},
			repeat: { type: 'v2', value: this.repeat },
			dashSpacing: { type: 'f', value: this.dashSpacing },
			dashSize: { type: 'f', value: this.dashSize },
			dashAxis: { type: 'v2', value: this.dashAxis },
			t: { type: 'f', value: this.t }
		},
		vertexShader: vertexShaderSource.join( '\r\n' ),
		fragmentShader: fragmentShaderSource.join( '\r\n' )
	});

	delete parameters.lineWidth;
	delete parameters.color;
	delete parameters.opacity;
	delete parameters.resolution;
	delete parameters.sizeAttenuation;
	delete parameters.alphaTest;
	delete parameters.repeat;
	delete parameters.dashSpacing;
	delete parameters.dashSize;
	delete parameters.dashAxis;
	delete parameters.t;

	material.type = 'MeshLineMaterial';

	material.setValues( parameters );

	return material;

};

MeshLineMaterial.prototype = Object.create( THREE.Material.prototype );
MeshLineMaterial.prototype.constructor = MeshLineMaterial;

MeshLineMaterial.prototype.copy = function ( source ) {

	THREE.Material.prototype.copy.call( this, source );

	this.lineWidth = source.lineWidth;
	this.color.copy( source.color );
	this.opacity = source.opacity;
	this.resolution.copy( source.resolution );
	this.sizeAttenuation = source.sizeAttenuation;
	this.visibility = source.visibility;
	this.alphaTest = source.alphaTest;
	this.repeat.copy( source.repeat );
	this.dashSpacing = source.dashSpacing;
	this.dashSize = source.dashSize;
	this.dashAxis.copy( source.dashAxis );
	this.t = source.t;

	return this;

};
