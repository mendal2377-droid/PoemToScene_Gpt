import {caveSection} from './landscape';
import {fullPoem,landmarks,type Landmark} from './poem';
import type {EnvironmentSettings} from './environment';

export type SceneId='autumn'|'snow'|'maple'|'peach'|'cave';
export type SceneDefinition={id:SceneId;title:string;titleLines:string[];author:string;era:string;chapter:string;theme:string;season:string;kind:'诗'|'记';opening:string[];caption:string[];intro:string;note:string;sound:string;environment:EnvironmentSettings;text:string[];landmarks:Landmark[];source:string};
const point=(id:string,name:string,line:string,x:number,z:number,description:string):Landmark=>({id,name,line,x,z,description,pair:'',icon:id});
export const scenes:SceneDefinition[]=[
 {id:'autumn',title:'山居秋暝',titleLines:['山居','秋暝'],author:'王维',era:'唐',chapter:'第一境',theme:'山水清音',season:'初秋',kind:'诗',opening:['空山新雨后，','天气晚来秋。'],caption:['明月松间照','清泉石上流'],intro:'雨歇，山静，月初升。',note:'清泉与松月相照，竹林与渔舟相应。寂静并非无人，而是万物各得其所。循着溪岸慢行，让清凉暮色留住脚步。',sound:'清泉近响，松风低回，竹叶随步履渐近。',environment:{hour:19,weather:'clear',cycling:false},text:fullPoem,landmarks:[...landmarks],source:'https://zh.wikisource.org/zh-hans/山居秋暝'},
 {id:'snow',title:'江雪',titleLines:['江','雪'],author:'柳宗元',era:'唐',chapter:'第二境',theme:'天地留白',season:'深冬',kind:'诗',opening:['千山鸟飞绝，','万径人踪灭。'],caption:['孤舟蓑笠翁','独钓寒江雪'],intro:'雪落无声，一舟不归。',note:'把热闹留在远处。雪山、枯枝与空阔的江面，围着一叶孤舟；风水之外，刻意不添鸟鸣。留白中的那一点人影，是这片天地的重心。',sound:'低低寒风，缓缓江水；无鸟鸣，无人语。',environment:{hour:9,weather:'snow',cycling:false},text:['千山鸟飞绝，万径人踪灭。','孤舟蓑笠翁，独钓寒江雪。'],landmarks:[point('ridge','千山白','千山鸟飞绝',14,18,'远山一层层淡入雪色。天与地之间，不见飞鸟，只听见风掠过空江。'),point('path','空山径','万径人踪灭',7,2,'小径向白茫茫的山中延伸。来路渐隐，足下的安静，比远山更深。'),point('fisher','蓑笠影','孤舟蓑笠翁',4,-18,'江上只有一叶小舟，一顶斗笠。偌大的天地，把这一点身影衬得格外坚定。'),point('river','寒江雪','独钓寒江雪',1,-35,'细雪落向墨青的江面，随水而去。停一停，不必急着替这一刻寻找答案。')],source:'https://zh.wikisource.org/zh-hans/江雪'},
 {id:'maple',title:'枫桥夜泊',titleLines:['枫桥','夜泊'],author:'张继',era:'唐',chapter:'第三境',theme:'一江客梦',season:'深秋',kind:'诗',opening:['月落乌啼霜满天，','江枫渔火对愁眠。'],caption:['姑苏城外寒山寺','夜半钟声到客船'],intro:'一江渔火，半夜钟声。',note:'冷月、乌啼与江枫，把夜色收拢到客船旁。远寺的钟声穿过水面，偶尔抵达耳边；不是热闹的夜游，而是醒着的人与一江灯影相伴。',sound:'近岸水拍、偶发乌啼、远寺疏钟，风过枫叶。',environment:{hour:23,weather:'clear',cycling:false},text:['月落乌啼霜满天，江枫渔火对愁眠。','姑苏城外寒山寺，夜半钟声到客船。'],landmarks:[point('moon','霜天月','月落乌啼霜满天',14,18,'月色落在冷江上。枫枝间偶有乌啼，叫过以后，夜反而显得更长。'),point('fire','江枫火','江枫渔火对愁眠',7,2,'丹枫在夜色里沉下去，渔火在水面上浮起来。一冷一暖，都映着未眠的客心。'),point('temple','寒山寺','姑苏城外寒山寺',4,-18,'寺影隔江而立。看不清檐下的细节，只见灯色从门窗间透出，像远处仍有人守夜。'),point('bell','客船钟','夜半钟声到客船',1,-35,'停在泊舟旁，等一声钟慢慢散开。声音走过的水面，比眼睛所见更远。')],source:'https://zh.wikisource.org/zh-hans/楓橋夜泊'},
 {id:'peach',title:'桃花源记',titleLines:['桃花','源记'],author:'陶渊明',era:'东晋',chapter:'第四境',theme:'花径忘归',season:'仲春',kind:'记',opening:['芳草鲜美，','落英缤纷。'],caption:['复行数十步','豁然开朗'],intro:'沿花溪而入，向人间深处。',note:'先是夹岸桃花，再是狭窄石隙，随后田畴与屋舍展开。桃源的温柔，不止于花，更在炊烟、鸡犬与安居的日常。这里以原文空间次序作诗意演绎。',sound:'花溪、春鸟与轻风；穿过石隙，渐闻远村鸡犬。',environment:{hour:9,weather:'clear',cycling:false},text:[
 '晋太元中，武陵人捕鱼为业。缘溪行，忘路之远近。忽逢桃花林，夹岸数百步，中无杂树，芳草鲜美，落英缤纷。渔人甚异之，复前行，欲穷其林。',
 '林尽水源，便得一山，山有小口，仿佛若有光。便舍船，从口入。初极狭，才通人。复行数十步，豁然开朗。土地平旷，屋舍俨然，有良田、美池、桑竹之属。阡陌交通，鸡犬相闻。其中往来种作，男女衣着，悉如外人。黄发垂髫，并怡然自乐。',
 '见渔人，乃大惊，问所从来，具答之。便要还家，为设酒杀鸡作食。村中闻有此人，咸来问讯。自云先世避秦时乱，率妻子邑人来此绝境，不复出焉，遂与外人间隔。问今是何世，乃不知有汉，无论魏晋。此人一一为具言所闻，皆叹惋。余人各复延至其家，皆出酒食。停数日，辞去。此中人语云：“不足为外人道也。”',
 '既出，得其船，便扶向路，处处志之。及郡下，诣太守，说如此。太守即遣人随其往，寻向所志，遂迷，不复得路。',
 '南阳刘子骥，高尚士也，闻之，欣然规往。未果，寻病终。后遂无问津者。'],landmarks:[point('blossom','夹岸花','落英缤纷',14,18,'桃花把水面映成浅浅的春色。花瓣绕过身旁，溪水仍向林深处流去。'),point('passage','一线光','仿佛若有光',6,0,'离开花林，石隙收窄，天光只剩前方的一线。沿小径穿过，就能看见石后开阔的田园。'),point('field','豁然境','豁然开朗',1,-18,'石壁退开，田畴、池水与屋舍忽然铺展。先前不见的开阔，如今全在眼前。'),point('village','鸡犬村','并怡然自乐',21,-26,'屋舍沿田而居，远处鸡犬相闻。桃源不是空无一人的仙境，而是可以平静过日子的地方。')],source:'https://zh.wikisource.org/zh-hans/桃花源記'},
 {id:'cave',title:'游褒禅山记',titleLines:['游褒禅','山记'],author:'王安石',era:'北宋',chapter:'第五境',theme:'持火问山',season:'夏山',kind:'记',opening:['入之愈深，','其见愈奇。'],caption:['尽吾志也','而不能至者可以无悔矣'],intro:'泉声渐远，一灯向幽深。',note:'从山寺与仆碑沿石阶攀升，侧泉渐远，近崖高耸，再持火进入幽深石洞。光照所及是眼前，未见之处仍留给想象。以行路体会志、力与所凭借之物；这一程并不替原文许诺洞底。',sound:'石阶上山风渐起，侧泉近响；入洞后水滴回响，近身火声轻响。',environment:{hour:15,weather:'cloudy',cycling:false},text:[
 '褒禅山亦谓之华山。唐浮图慧褒始舍于其址，而卒葬之；以故其后名之曰“褒禅”。今所谓慧空禅院者，褒之庐冢也。距其院东五里，所谓华阳洞者，以其在华山之阳名之也。距洞百余步，有碑仆道，其文漫灭，独其为文犹可识曰“花山”，今言“华”如“华实”之“华”者，盖音谬也。',
 '其下平旷，有泉侧出，而记游者甚众，所谓前洞也。由山以上五六里，有穴窈然，入之甚寒，问其深，则其好游者不能穷也，谓之后洞。余与四人拥火以入，入之愈深，其进愈难，而其见愈奇。有怠而欲出者，曰：“不出，火且尽。”遂与之俱出。盖余所至，比好游者尚不能十一，然视其左右，来而记之者已少；盖其又深，则其至又加少矣。方是时，余之力尚足以入，火尚足以明也。既其出，则或咎其欲出者，而余亦悔其随之，而不得极夫游之乐也。',
 '于是余有叹焉。古人之观于天地、山川、草木、虫鱼、鸟兽，往往有得，以其求思之深而无不在也。夫夷以近，则游者众；险以远，则至者少。而世之奇伟、瑰怪、非常之观，常在于险远，而人之所罕至焉，故非有志者不能至也。有志矣，不随以止也，然力不足者，亦不能至也。有志与力，而又不随以怠，至于幽暗昏惑而无物以相之，亦不能至也。然力足以至焉而不至，于人为可讥，而在己为有悔；尽吾志也而不能至者，可以无悔矣，其孰能讥之乎？此余之所得也。',
 '余于仆碑，又以悲夫古书之不存，后世之谬其传，而莫能名者，何可胜道也哉！此所以学者不可以不深思而慎取之也。',
 '四人者：庐陵萧君圭君玉，长乐王回深父，余弟安国平父、安上纯父。至和元年七月某日，临川王某记。'],landmarks:[point('stele','仆碑道','其文漫灭',14,18,'旧碑倒在山径旁，字迹被风雨慢慢磨去。辨认与追问，也是一种向深处行走。'),point('spring','侧出泉','有泉侧出',7,2,'前洞平旷，泉声从石侧传来。循声向里，山色渐渐让位给石壁的纹理。'),point('torch','拥火入','入之愈深，其进愈难',0,-18,'火光照亮近处的岩纹。水滴落下，回声向更深处散开；天光和风声留在身后。'),point('resolve','幽深处','尽吾志也',8,-53,'山的深处仍在光外。前方洞厅展开，石柱与浅潭围出可慢行的一隅。更深处仍隐在暗中；可循光返回洞口，回望来路。')],source:'https://zh.wikisource.org/zh-hans/遊褒禪山記'},
];
export const getScene=(id:unknown)=>scenes.find(scene=>scene.id===id)||scenes[0];
export const sceneKey='shijing-scene-v1';
export const progressKey=(id:SceneId)=>id==='autumn'?'shijing-discoveries-v1':`shijing-discoveries-${id}-v1`;
export const sceneEnvironmentKey=(id:SceneId)=>id==='autumn'?'shijing-environment-v1':`shijing-environment-${id}-v1`;
// A missing or retired scene opens the welcome collection instead of choosing for the visitor.
export function readScene():SceneDefinition|null {try{return scenes.find(scene=>scene.id===localStorage.getItem(sceneKey))||null;}catch{return null;}}
/** Shelter follows the walkable path; weather stays outside the rock passages. */
export function shelterAt(id:SceneId,x:number,z:number){
 const center=Math.sin(z*.065)*7+6;
 if(Math.abs(x-center)>(id==='cave'?caveSection(z).width:3))return 0;
 if(id==='peach')return Math.max(0,Math.min(1,(5-z)/3,(z+10)/3));
 if(id==='cave')return Math.max(0,Math.min(1,(-7-z)/6));
 return 0;
}
