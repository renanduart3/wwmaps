import type {Locale} from './i18n';
const en={saveImage:'Save your externally generated image as',draft:'Draft',scheduled:'Scheduled',published:'Published',count:'{count} visual posts',preview:'Local preview — not public yet',sources:'Sources',download:'Download image',back:'Back to the observatory',period:'Publication',style:'Visual style'};
const pt:Record<keyof typeof en,string>={saveImage:'Salve sua imagem gerada externamente como',draft:'Rascunho',scheduled:'Agendado',published:'Publicado',count:'{count} posts visuais',preview:'Prévia local — ainda não publicado',sources:'Fontes',download:'Baixar imagem',back:'Voltar ao observatório',period:'Publicação',style:'Estilo visual'};
export const contentText=(lang:Locale)=>lang==='en'?en:pt;
