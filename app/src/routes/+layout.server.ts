import { env } from '$env/dynamic/private';

export function load() {
  return {
    studioName: env.STUDIO_NAME ?? ''
  };
}
