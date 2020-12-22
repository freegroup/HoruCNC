
g00LineMaterial = new THREE.LineBasicMaterial( {
	linewidth: 0.5,
	color: 'grey',
	transparent: true,
	opacity : 0.2
} );

g01LineMaterial = new THREE.LineBasicMaterial({
	color:'#ffa500',
	linewidth:0.5,
	opacity : 1
})

g00LineColor = {r:200, g:200, b:200}
g01LineColor = {r:242, g:169, b:60}

let GCView = function(container) {
	// container element, needs to be a div
	this.container = container;
	this.containerWidth;
	this.containerHeight;
	this.camera;
	this.controls;
	this.scene;
	this.renderer;

	this.lastCoordinate = {X:null,Y:null,Z:null}
	this.lastMaterial = undefined
	this.lastGeometry = undefined
	this.lastPositions = []
	this.allLines = new THREE.Object3D();

	this.relative = false
	this.bbbox = {
        min: {
            x: 1000000,
            y: 1000000,
            z: 1000000
        },
        max: {
            x: -1000000,
            y: -1000000,
            z: -1000000
        }
    };

	// setup container width and height as they are only given as strings with px appended
	this.containerWidth = this.container.style.width.substr(0,this.container.style.width.length-2);
	this.containerHeight = this.container.style.height.substr(0,this.container.style.height.length-2);

	// setup a camera view
	this.camera = new THREE.PerspectiveCamera( 70, this.containerWidth / this.containerHeight, 1, 1000 );

	// add mouse pan tilt and zoom
	this.controls = new THREE.TrackballControls( this.camera, this.container );
	this.controls.rotateSpeed = 7;
	this.controls.zoomSpeed = .1;

	// create the scene object
	this.scene = new THREE.Scene();
	this.scene.background = new THREE.Color( 0xf2f3f7 )

	// check if webgl is available on the users browser
	if ( this.webglAvailable() ) {
		// use webgl
		console.log("WebGL")
		this.renderer = new THREE.WebGLRenderer({ alpha: true });
	} else {
		// use canvas
		this.renderer = new THREE.CanvasRenderer({alpha:true});
		console.log("Canvas only")
	}

	// set renderer options
	this.renderer.setClearColor( 0x000000 );
	this.renderer.setSize(this.containerWidth,this.containerHeight);

	// remove any existing data from container div
	this.container.innerHTML = '';

	// add the renderer to the container div
	this.container.appendChild( this.renderer.domElement );

	// add an event to handle window resizes
	window.addEventListener( 'resize', this.onWindowResize, false );
};

GCView.prototype.onWindowResize = function() {
	// this just updates the viewport when the window is resized
	this.camera.aspect = this.containerWidth / this.containerHeight;
	this.camera.updateProjectionMatrix();
	this.renderer.setSize( this.containerWidth, this.containerHeight );
}

GCView.prototype.animate = function() {
	// this renders the scene with the camera
	this.controls.update();
	this.renderer.render( this.scene, this.camera );

	// requestAnimationFrame will pause the animation loop if the tab or window is not focused
	// basically it will repeatedly call the animate function (this function)
	requestAnimationFrame(this.animate.bind(this))
}

GCView.prototype.webglAvailable = function() {
	// check if webgl is available on the users browser
	try {
		let canvas = document.createElement( 'canvas' );
		return !!( window.WebGLRenderingContext && (
			canvas.getContext( 'webgl' ) ||
			canvas.getContext( 'experimental-webgl' ) )
		);
	} catch ( e ) {
		return false;
	}
}

GCView.prototype.drawAxes = function(dist) {
	console.time("drawAxes")
	// draw the axis lines for XYZ with length of dist
	let xyz = new THREE.Object3D();
	let lineMaterialBlue = new THREE.LineBasicMaterial({color:'blue'});
	let lineMaterialRed = new THREE.LineBasicMaterial({color:'red'});
	let lineMaterialGreen = new THREE.LineBasicMaterial({color:'green'});

	let xGeo = new THREE.Geometry();
	xGeo.vertices.push(new THREE.Vector3(0,0,0), new THREE.Vector3(dist,0,0));

	let yGeo = new THREE.Geometry();
	yGeo.vertices.push(new THREE.Vector3(0,0,0), new THREE.Vector3(0,dist,0));

	let zGeo = new THREE.Geometry();
	zGeo.vertices.push(new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,dist));

	xyz.add(new THREE.Line(xGeo,lineMaterialBlue), new THREE.Line(yGeo,lineMaterialRed), new THREE.Line(zGeo,lineMaterialGreen));

	// add axis lines
	this.scene.add(xyz);

	// set camera position
	this.camera.position.z = dist;
	console.timeEnd("drawAxes")
}


GCView.prototype.loadGC = function(gc) {
	// loop through each gcode line
	console.time("gcLines")
	let l = gc.split('\n');
	// Add all line segments the scene
	l.forEach( command => this.gcLine(command))
	// Add the last open line segment as well to the scene
	//
	if(this.lastGeometry) {
		this.lastGeometry.setAttribute('position', new THREE.Float32BufferAttribute(this.lastPositions, 3))
		this.lastGeometry.computeBoundingSphere()
		this.allLines.add(new THREE.Line(this.lastGeometry, this.lastMaterial))
	}

	console.timeEnd("gcLines")

	console.time("scene.add")
	this.scene.add(this.allLines);
	console.timeEnd("scene.add")

	// draw the axis lines based on the longest axis of the gcode dimensions
	this.drawAxes(Math.max(this.bbbox.max.x, this.bbbox.max.y, this.bbbox.max.z));

	// display it all
	console.time("animate")
	this.animate();
	console.timeEnd("animate")

	function fitCameraToSelection( camera, controls, selection, fitOffset = 1.2 ) {

		const box = new THREE.Box3();

		for( const object of selection ) box.expandByObject( object );

		const size = box.getSize( new THREE.Vector3() );
		const center = box.getCenter( new THREE.Vector3() );

		const maxSize = Math.max( size.x, size.y, size.z );
		const fitHeightDistance = maxSize / ( 2 * Math.atan( Math.PI * camera.fov / 360 ) );
		const fitWidthDistance = fitHeightDistance / camera.aspect;
		const distance = fitOffset * Math.max( fitHeightDistance, fitWidthDistance );

		const direction = controls.target.clone()
			.sub( camera.position )
			.normalize()
			.multiplyScalar( distance );

		controls.maxDistance = distance * 10;
		controls.target.copy( center );

		camera.near = distance / 100;
		camera.far = distance * 100;
		camera.updateProjectionMatrix();

		camera.position.copy( controls.target ).sub(direction);
		controls.update();
	}

	fitCameraToSelection(this.camera, this.controls, this.allLines.children)
	return {'status':'complete','bounds':this.bbbox};

}

GCView.prototype.gcLine = function(text) {
	text = text.replace(/;.*$/, '').trim(); // remove comments
	// a token is a segment of the line separated by a space
	let tokens = text.split(' ')
	if (tokens) {
		// the command (G or M etc) is always first
		let args = {'cmd':tokens[0]};
		tokens.splice(1).forEach(function(token) {
			// for each argument, add it to the args object
			args[token[0]] = parseFloat(token.substring(1))
		});
		try {
			this[args['cmd']](args)
		} catch (exc) {
			console.log('GCView Error: unsupported command '+args['cmd'], exc);
		}
	}
}

GCView.prototype.moveAbsTo = function(args, material) {
	let newCoordinate = {
		X: args.X !== undefined ? this.absolute(this.lastCoordinate.X, args.X) : this.lastCoordinate.X,
		Y: args.Y !== undefined ? this.absolute(this.lastCoordinate.Y, args.Y) : this.lastCoordinate.Y,
		Z: args.Z !== undefined ? this.absolute(this.lastCoordinate.Z, args.Z) : this.lastCoordinate.Z,
	}

	// we have not the same move operation and we have to create a new LINE object and apply the material to them
	//
	if( material !== this.lastMaterial){
		if(this.lastGeometry) {
			this.lastGeometry.setAttribute('position', new THREE.Float32BufferAttribute(this.lastPositions, 3))
			this.lastGeometry.computeBoundingSphere()
			this.allLines.add(new THREE.Line(this.lastGeometry, this.lastMaterial))
			this.lastGeometry = new THREE.BufferGeometry()
			this.lastPositions = []
			this.lastPositions.push( this.lastCoordinate.X, this.lastCoordinate.Y, this.lastCoordinate.Z )
		}else{
			this.lastGeometry = new THREE.BufferGeometry()
			this.lastPositions = []
		}
	}

	this.lastMaterial = material
	this.lastCoordinate = newCoordinate
	this.lastPositions.push( newCoordinate.X, newCoordinate.Y, newCoordinate.Z )

	// setup bounding area
	this.bbbox.min.x = Math.min(this.bbbox.min.x, newCoordinate.X)
	this.bbbox.min.y = Math.min(this.bbbox.min.y, newCoordinate.Y);
	this.bbbox.min.z = Math.min(this.bbbox.min.z, newCoordinate.Z);
	this.bbbox.max.x = Math.max(this.bbbox.max.x, newCoordinate.X);
	this.bbbox.max.y = Math.max(this.bbbox.max.y, newCoordinate.Y);
	this.bbbox.max.z = Math.max(this.bbbox.max.z, newCoordinate.Z);
}


GCView.prototype.delta = function(v1, v2) {
	return this.relative ? v2 : v2 - v1;
}

GCView.prototype.absolute = function(v1, v2) {
	return this.relative ? v1 + v2 : v2;
}


GCView.prototype.G00 = function (args) {
	this.moveAbsTo(args, g00LineMaterial)
}

GCView.prototype.G01 = function(args) {
	this.moveAbsTo(args, g01LineMaterial);
}

GCView.prototype.M03 = function(args) {
	//console.log("GCODE: start spindel")
}

GCView.prototype.M05 = function(args) {
	//console.log("GCODE: stop spindel")
}

GCView.prototype.G90 = function(args) {
	this.relative = false;
}

GCView.prototype.G91 = function(args) {
	this.relative = true;
}

GCView.prototype.G20 = function(args) {
	// set units to inches
}

GCView.prototype.G21 = function(args) {
	// set units to mm
	// could be used at a later date
	// to display units on screen
}
