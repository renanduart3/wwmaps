import { resolve, join } from 'node:path';
import { readVisualPosts, visualImage, visualPostUrl } from '@atlas/content-store';
import type { VisualPost } from '@atlas/contracts';
// Track JSON files (including new folders) for Vite development refreshes.
const watched=import.meta.glob('../../../../content/visuals/*/post.json');void watched;
export const visualRoot=resolve(import.meta.dirname,'../../../../content/visuals');
export const getVisualPosts=()=>readVisualPosts(visualRoot,{drafts:import.meta.env.DEV});
export const getPublicVisualPosts=()=>readVisualPosts(visualRoot,{validate:true});
export const postImage=async(post:VisualPost,language:string)=>{
  const filename=await visualImage(join(visualRoot,post.id),language);
  return filename?`/visual-images/${post.id}/${filename}`:null;
};
export { visualPostUrl };
