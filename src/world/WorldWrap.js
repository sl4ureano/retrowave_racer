export function createWorldWrap(world, worldBack, worldFront, worldLength){
  return function wrapWorld(){
    const base = ((world.position.z + worldLength / 2) % worldLength + worldLength) % worldLength - worldLength / 2;
    world.position.z = base;
    worldBack.position.z = base - worldLength;
    worldFront.position.z = base + worldLength;
  };
}
