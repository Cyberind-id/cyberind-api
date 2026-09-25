const express=require("express");const {execFile}=require("node:child_process");const crypto=require("node:crypto");
const app=express();app.use(express.json({limit:"16kb"}));
const PORT=process.env.PORT||3000, API_KEY=process.env.NMAP_API_KEY||"", ALLOWED=(process.env.NMAP_ALLOWED_TARGETS||"").split(",").map(x=>x.trim()).filter(Boolean);
const PROFILES={
 quick:["-sT","-T3","--top-ports","100","-oX","-"],
 service:["-sT","-sV","-T3","--top-ports","100","-oX","-"],
 full:["-sT","-sV","-T3","-p-","-oX","-"]
};
function auth(req,res){if(!API_KEY||!crypto.timingSafeEqual(Buffer.from(String(req.get("x-api-key")||"")),Buffer.from(API_KEY)))return res.status(401).json({success:false,error:"Unauthorized"});return true}
function allowedTarget(t){return ALLOWED.includes(t)}
function parseXml(xml){const hosts=[];for(const h of xml.matchAll(/<host>([\\s\\S]*?)<\\/host>/g)){const block=h[1],a=block.match(/<address addr="([^"]+)"/),st=block.match(/<status state="([^"]+)"/);const ports=[];for(const p of block.matchAll(/<port protocol="([^"]+)" portid="([^"]+)">([\\s\\S]*?)<\\/port>/g)){const s=p[3].match(/<state state="([^"]+)"/),svc=p[3].match(/<service name="([^"]*)"(?: product="([^"]*)")?(?: version="([^"]*)")?/);ports.push({protocol:p[1],port:Number(p[2]),state:s?s[1]:"unknown",service:svc?svc[1]:null,product:svc&&svc[2]?svc[2]:null,version:svc&&svc[3]?svc[3]:null})}hosts.push({address:a?a[1]:null,state:st?st[1]:null,ports})}return hosts}
app.get("/api/health",(req,res)=>res.json({success:true,status:"ok",service:"cyberind-nmap-api"}));
app.get("/api/v1/nmap",(req,res)=>res.json({success:true,name:"Cyberind Nmap REST API",profiles:Object.keys(PROFILES),usage:"POST /api/v1/nmap/scan"}));
app.post("/api/v1/nmap/scan",(req,res)=>{
 if(!auth(req,res))return;
 const {target,profile="quick"}=req.body||{};
 if(typeof target!=="string"||!target||!allowedTarget(target))return res.status(403).json({success:false,error:"Target is not in NMAP_ALLOWED_TARGETS"});
 if(!PROFILES[profile])return res.status(400).json({success:false,error:"Invalid profile",allowed:Object.keys(PROFILES)});
 const args=[...PROFILES[profile],target], started=Date.now();
 execFile("nmap",args,{timeout:process.env.NMAP_TIMEOUT_MS?Number(process.env.NMAP_TIMEOUT_MS):120000,maxBuffer:8*1024*1024},(error,stdout,stderr)=>{
   if(error)return res.status(502).json({success:false,error:"Nmap execution failed",detail:stderr||error.message});
   res.json({success:true,data:{target,profile,duration_ms:Date.now()-started,hosts:parseXml(stdout)},raw_xml:stdout});
 });
});
app.listen(PORT,()=>console.log("Cyberind Nmap API listening on "+PORT));