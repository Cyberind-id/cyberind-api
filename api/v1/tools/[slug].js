const tools={"url-check":{name:"URL Check",description:"Validate and normalize a URL."},"ip-info":{name:"IP Info",description:"IP information endpoint."},"headers":{name:"HTTP Headers",description:"Return selected request headers."}};
module.exports=(req,res)=>{
  if(req.method==="OPTIONS") return res.status(204).end();
  if(req.method!=="GET") return res.status(405).json({success:false,error:{code:"METHOD_NOT_ALLOWED",message:"Only GET is supported."}});
  const slug=req.query&&req.query.slug;
  const tool=tools[slug];
  if(!tool) return res.status(404).json({success:false,error:{code:"TOOL_NOT_FOUND",message:"Tool not found."}});
  const data={slug,...tool};
  if(slug==="headers") data.headers={userAgent:req.headers["user-agent"]||null,accept:req.headers.accept||null,host:req.headers.host||null};
  return res.status(200).json({success:true,data,timestamp:new Date().toISOString()});
};