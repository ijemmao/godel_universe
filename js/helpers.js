let index = 0;
let easeUp = 1;
let easeDown = 0;
let easeInto = 1;
let direction = 1;
let directionVector = new THREE.Vector3();
let hitMaxDistance = false;
let travelBackTime = 3;

const cameraLogic = (futureCone, focused, controls, camera) => {
  if (focused) {
    controls.target.copy(futureCone.position);
    camera.position = futureCone.position;
  } else {
    controls.target.copy(new THREE.Vector3(0, 0, 0));
  }
}

const generateCircle = (radius, color) => {
  let circleGeometry = new THREE.CircleGeometry(radius, 90);
  let circleEdges = new THREE.EdgesGeometry(circleGeometry);
  let circle = new THREE.LineSegments(circleEdges, new THREE.LineBasicMaterial({ color: color }));
  circle.rotateX(Math.PI / 2);
  scene.add(circle);
  return circle;
}

const generateHyperplane = (time) => {
  for (let i = 1; i <= 3; i++) {
    let cone = generateCircle(i, 0xffffff);
    cone.position.y = time;
  }
}

const generateLine = (start, end) => {
  let lineMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff
  });
  let lineGeometry = new THREE.Geometry();
  lineGeometry.vertices.push(
    new THREE.Vector3(start.x, start.y, start.z),
    new THREE.Vector3(end.x, end.y, end.z)
  );
  let line = new THREE.Line(lineGeometry, lineMaterial);
  scene.add(line);
}

const generateLightCone = (color, flipped) => {
  let coneGeometry = new THREE.ConeGeometry(initRadius, heightLimit, 32, true);
  let coneMaterial = new THREE.MeshBasicMaterial({ color: color, }); //transparent: true, opacity: 0.9 });
  let cone = new THREE.Mesh(coneGeometry, coneMaterial);
  coneGeometry.translate(0, -heightLimit / 2, 0);
  if (!flipped) {
    cone.rotateX(Math.PI)
  }
  scene.add(cone);
  return cone;
}

const generateWorldline = () => {
  let worldlineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
  let worldlineGeometry = new THREE.BufferGeometry();
  let positions = new Float32Array(MAX_POINTS * 3);
  worldlineGeometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));

  worldlineGeometry.setDrawRange(0, 2);

  let line = new THREE.Line(worldlineGeometry, worldlineMaterial);
  line.frustumCulled = false;

  scene.add(line);
  return line;
}

const updateWorldline = (worldline, position) => {
  let positions = worldline.geometry.attributes.position.array;
  if (index < MAX_POINTS) {
    positions[index * 3 - 3] = position.x;
    positions[index * 3 - 2] = position.y;
    positions[index * 3 - 1] = position.z;
  }
  if (index * 3 - 6 >= 0) {
    let lastVector = new THREE.Vector3(positions[index * 3 - 6], positions[index * 3 - 5], positions[index * 3 - 4]);
    let newVector = new THREE.Vector3(positions[index * 3 - 3], positions[index * 3 - 2], positions[index * 3 - 1]);
    directionVector.subVectors(newVector, lastVector).normalize();

  }
  worldline.geometry.attributes.position.needsUpdate = true;
  index += 1;
}

const rotating = (future, past, magnitude, magLimit) => {
  const scalePercentage = magnitude / magLimit; // percetange of distance traveled
  const easePercentage = (magnitude + .4 - 3) / .4; // used to ease when about to switch directions

  future.scale.set(1 * (1 + scalePercentage), 1 * (1 - scalePercentage + .1), 1 * (1 + scalePercentage)); // widens lightcone
  past.scale.set(1 * (1 + scalePercentage), 1 * (1 - scalePercentage + .1), 1 * (1 + scalePercentage)); // widens lightcone

  // future light cone
  future.position.x = (magnitude) * Math.cos(time) + 0;
  future.position.z = (magnitude) * Math.sin(time) + 0;
  future.rotation.y = time + 1.5;

  if (scalePercentage >= .82 && easeDown < 1) {
    easeDown += 0.01;
  } else if (scalePercentage >= .7 && scalePercentage <= .82 && easeUp > 0) {
    easeUp -= 0.01;
  }
  if (scalePercentage >= .81) {
    // going into the past
    easeUp = 1;
    future.position.y -= (0.01 * easeDown) * easeInto;
  } else if (scalePercentage < .81) {
    // going into the future
    easeDown = 0;
    if (scalePercentage >= .7) {
      future.position.y += (0.01 - (0.01 * scalePercentage)) * easeUp;
    } else {
      future.position.y += 0.01 - (0.01 * scalePercentage);
    }
  }

  future.rotation.z = scalePercentage * Math.PI / 2;
  HELPERS.updateWorldline(subjectWorldline, future.position);
  
  // past light cone
  past.position.x = (magnitude) * Math.cos(time) + 0;
  past.position.z = (magnitude) * Math.sin(time) + 0;
  past.rotation.y = -time + 1.5;
  if (scalePercentage >= .81) {
    // going into the past
    easeUp = 1;
    past.position.y -= (0.01 * easeDown) * easeInto;
  } else if (scalePercentage < .81) {
    // going into the future
    easeDown = 0;
    if (scalePercentage >= .70) {
      past.position.y += (0.01 - (0.01 * scalePercentage)) * easeUp;
    } else {
      past.position.y += 0.01 - (0.01 * scalePercentage);
    }
  }
  past.rotation.z = scalePercentage * Math.PI / 2;
}

loopDistance = (distance) => {
  if (!hitMaxDistance) {
    distance += 0.003;
    easeInto = 1;
    if (distance >= 3) {
      hitMaxDistance = true;
      console.log(hitMaxDistance, time, distance / 3.4);
      lastTime = time;
    }
  } else {
    if (time - lastTime >= travelBackTime) {
      distance -= 0.003;
      if (distance < 0) {
        hitMaxDistance = false;
      }
    } else if (time - lastTime >= .5){
      let difference = time - lastTime;
      easeInto =  1 - difference / travelBackTime + .2;
    }
  }
  return distance;
}

((root) => {
  if (root !== undefined) {
    // Global variable
    root.HELPERS = { cameraLogic, generateCircle, generateHyperplane, generateLine, generateLightCone, generateWorldline, updateWorldline, rotating, loopDistance };
  }
})(this);
