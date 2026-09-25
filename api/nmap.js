const net=require("node:net");
const dns=require("node:dns").promises;
const crypto=require("node:crypto");

const API_KEY=process.env.NMAP_API_KEY||"";
const ALLOWED=(process.env.NMAP_ALLOWED_TARGETS||"").split(",").map(v=>v.trim()).filter(Boolean);
const MAX_PORTS=Math.min(Number(process.env.NMAP_MAX_PORTS||2048),65535);
const CONCURRENCY=Math.min(Math.max(Number(process.env.NMAP_CONCURRENCY||40),1),100);
const TIMEOUT=Math.min(Math.max(Number(process.env.NMAP_PORT_TIMEOUT_MS||1200),100),5000);

const COMMON=[21,22,23,25,53,80,110,111,135,139,143,443,445,465,587,993,995,1433,1521,2049,2375,3000,3306,3389,5000,5432,5601,5672,5900,6379,6443,8000,8080,8081,8443,8888,9200,9300,11211,27017];
const WEB=[80,443,3000,5000,8000,8008,8080,8081,8443,8888,9000,9443];
const PROFILES={
  quick:{description:"Small common-port scan",ports:COMMON.slice(0,12)},
  common:{description:"Common TCP services",ports:COMMON},
  web:{description:"Common HTTP/HTTPS ports",ports:WEB},
  top100:{description:"First 100 TCP ports",ports:Array.from({length:100},(_,i)=>i+1)},
  top1000:{description:"First 1000 TCP ports",ports:Array.from({length:1000},(_,i)=>i+1)},
  full:{description:"TCP ports 1-65535; subject to MAX_PORTS and serverless timeout",ports:Array.from({length:65535},(_,i)=>i+1)}
};

const SERVICE_NAMES={
  21:"ftp",22:"ssh",23:"telnet",25:"smtp",53:"dns",80:"http",110:"pop3",111:"rpcbind",
  135:"msrpc",139:"netbios-ssn",143:"imap",443:"https",445:"smb",465:"smtps",587:"submission",
  993:"imaps",995:"pop3s",1433:"mssql",1521:"oracle",2049:"nfs",2375:"docker",3306:"mysql",
  3389:"rdp",5432:"postgresql",5900:"vnc",6379:"redis",8080:"http-proxy",8443:"https-alt",
  9200:"elasticsearch",11211:"memcached",27017:"mongodb"
};

function authorized(req){
  const supplied=String(req.headers["x-api-key"]||"");
  if(!API_KEY||supplied.length!==API_KEY.length)return false;
  return crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(API_KEY));
}
function targetAllowed(target){
  if(ALLOWED.length===0)return false;
  return ALLOWED.includes(target);
}
function normalizePorts(input,profile){
  let ports=input;
  if(ports===undefined)ports=PROFILES[profile].ports;
  if(ports==="all")ports=Array.from({length:65535},(_,i)=>i+1);
  if(!Array.isArray(ports))throw new Error("ports must be an array or omitted");
  const unique=[...new Set(ports.map(Number))].sort((a,b)=>a-b);
  if(unique.length>MAX_PORTS)throw new Error("Port count exceeds NMAP_MAX_PORTS");
  if(unique.some(p=>!Number.isInteger(p)||p<1||p>65535))throw new Error("Port must be an integer from 1 to 65535");
  return unique;
}
function probe(host,port){
  return new Promise(resolve=>{
    const socket=new net.Socket();let done=false, chunks=[];
    const finish=(state,banner=null)=>{if(done)return;done=true;socket.destroy();resolve({port,state,service:SERVICE_NAMES[port]||null,banner})};
    socket.setTimeout(TIMEOUT);
    socket.once("connect",()=>{
      if([80,443,8080,8000,8008,8081,8443,8888,9000,9443].includes(port)){
        socket.write("HEAD / HTTP/1.0\r\nHost: "+host+"\r\nUser-Agent: Cyberind-Nmap/1.0\r\nConnection: close\r\n\r\n");
      }else{
        socket.write("\r\n");
      }
    });
    socket.on("data",d=>{chunks.push(d);if(Buffer.concat(chunks).length>=1024)finish("open",Buffer.concat(chunks).toString("utf8").slice(0,1024))});
    socket.once("timeout",()=>finish("filtered"));
    socket.once("error",()=>finish("closed"));
    socket.once("close",()=>{if(!done)finish("closed",chunks.length?Buffer.concat(chunks).toString("utf8").slice(0,1024):null)});
    socket.connect(port,host);
  });
}
async function mapLimit(items,limit,fn){
  const out=new Array(items.length);let next=0;
  async function worker(){while(true){const i=next++;if(i>=items.length)return;out[i]=await fn(items[i]);}}
  await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));return out;
}
async function resolveTarget(target){
  if(net.isIP(target))return {input:target,ip:target,hostname:null};
  const a=await dns.lookup(target);
  let reverse=[];try{reverse=await dns.reverse(a.address)}catch{}
  return {input:target,ip:a.address,hostname:reverse[0]||null};
}
module.exports=async(req,res)=>{
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","Content-Type,X-API-Key");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  if(req.method==="OPTIONS")return res.status(204).end();

  if(req.method==="GET")return res.status(200).json({
    success:true,name:"Cyberind Nmap-compatible REST API",version:"2.0.0",
    capabilities:["TCP port scan","service hints","HTTP banner","DNS resolution","reverse DNS","custom ports","scan profiles"],
    profiles:Object.fromEntries(Object.entries(PROFILES).map(([k,v])=>[k,{description:v.description,ports:v.ports.length}])),
    limits:{max_ports:MAX_PORTS,concurrency:CONCURRENCY,port_timeout_ms:TIMEOUT},
    endpoint:"POST /api/v1/nmap"
  });

  if(req.method!=="POST")return res.status(405).json({success:false,error:"Method not allowed"});
  if(!authorized(req))return res.status(401).json({success:false,error:"Unauthorized"});
  if(ALLOWED.length===0)return res.status(503).json({success:false,error:"NMAP_ALLOWED_TARGETS is not configured"});
  
  const body=req.body||{};
  const target=typeof body.target==="string"?body.target.trim():"";
  const profile=body.profile||"quick";
  if(!target||!targetAllowed(target))return res.status(403).json({success:false,error:"Target is not allowlisted"});
  if(!PROFILES[profile])return res.status(400).json({success:false,error:"Unknown profile",allowed:Object.keys(PROFILES)});
  
  let ports;
  try{ports=normalizePorts(body.ports,profile)}catch(e){return res.status(400).json({success:false,error:e.message})}
  let resolved;
  try{resolved=await resolveTarget(target)}catch(e){return res.status(400).json({success:false,error:"Target DNS resolution failed"})}
  
  const started=Date.now();
  const results=await mapLimit(ports,CONCURRENCY,p=>probe(resolved.ip,p));
  const open=results.filter(r=>r.state==="open");
  return res.status(200).json({
    success:true,
    data:{
      target:resolved.input,ip:resolved.ip,reverse_dns:resolved.hostname,
      profile,scanned_ports:results.length,open_ports:open.length,
      duration_ms:Date.now()-started,
      ports:results.filter(r=>r.state!=="closed"||body.include_closed===true)
    },
    timestamp:new Date().toISOString()
  });
};