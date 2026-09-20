import {PDFParse} from 'pdf-parse';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import fs from 'node:fs';
const files=['export-test.pdf','chapter-test.pdf','article-test.pdf','vocabulary-test.pdf','book-contents-test.pdf'];
const images=[];
for(const file of files){const parser=new PDFParse({data:new Uint8Array(fs.readFileSync(`tmp/pdfs/${file}`))});const rendered=await parser.getScreenshot({scale:.55});for(const page of rendered.pages){images.push({image:await loadImage(page.data),label:`${file} - ${page.pageNumber}`});fs.writeFileSync(`tmp/pdfs/${file}-${page.pageNumber}.png`,page.data);}await parser.destroy();}
const canvas=createCanvas(1400,Math.ceil(images.length/4)*500);const ctx=canvas.getContext('2d');ctx.fillStyle='#d9ded7';ctx.fillRect(0,0,canvas.width,canvas.height);images.forEach(({image,label},i)=>{const x=(i%4)*350+10,y=Math.floor(i/4)*500;ctx.fillStyle='#263527';ctx.font='11px sans-serif';ctx.fillText(label,x,y+18);ctx.drawImage(image,x,y+26);});fs.writeFileSync('tmp/pdfs/contact-sheet.png',canvas.toBuffer('image/png'));console.log(`${images.length} PDF pages rendered for inspection.`);
