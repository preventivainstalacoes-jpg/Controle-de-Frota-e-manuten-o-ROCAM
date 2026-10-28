import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {status,headers:cors});
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok",{headers:cors});
  if (req.method !== "POST") return json({success:false,error:"Método não permitido."},405);
  try {
    const url=Deno.env.get("SUPABASE_URL"), serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({success:false,error:"Configuração segura do Supabase ausente."},500);
    const client=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const authHeader=req.headers.get("Authorization");
    if (!authHeader) return json({success:false,error:"Não autenticado."},401);
    const token=authHeader.replace(/^Bearer\s+/i,"");
    const {data:caller,error:callerError}=await client.auth.getUser(token);
    if (callerError || !caller.user) return json({success:false,error:"Sessão inválida. Entre novamente."},401);
    const {data:callerProfile,error:callerProfileError}=await client.from("profiles").select("role,active").eq("id",caller.user.id).maybeSingle();
    if (callerProfileError || !callerProfile || callerProfile.role!=="admin" || callerProfile.active!==true)
      return json({success:false,error:"Somente Administrador ativo pode executar esta operação."},403);
    const body=await req.json();
    if (body.action === "send_password_recovery_email" || body.action === "generate_password_recovery_link") {
      const userId = String(body.userId || "").trim();
      if (!userId) return json({success:false,error:"Selecione um usuário válido."},400);
      const {data:targetProfile,error:profileError}=await client.from("profiles").select("id,email").eq("id",userId).maybeSingle();
      if (profileError || !targetProfile) return json({success:false,error:"Usuário não localizado no cadastro compartilhado."},404);
      const {data:targetAuth,error:targetAuthError}=await client.auth.admin.getUserById(userId);
      if (targetAuthError || !targetAuth.user?.email) return json({success:false,error:"A conta não possui e-mail válido para recuperação."},400);
      const email=String(targetAuth.user.email).trim().toLowerCase();
      const redirectTo="https://rocammecanizacao.com.br/";
      if (body.action === "send_password_recovery_email") {
        const {error:sendError}=await client.auth.resetPasswordForEmail(email,{redirectTo});
        if (sendError) return json({success:false,error:sendError.message},400);
        return json({success:true});
      }
      const {data:generated,error:generateError}=await client.auth.admin.generateLink({
        type:"recovery",
        email,
        options:{redirectTo}
      });
      const actionLink=generated?.properties?.action_link;
      if (generateError || !actionLink) return json({success:false,error:generateError?.message || "Não foi possível gerar o link de recuperação."},400);
      return json({success:true,link:actionLink,email});
    }
    if (body.action==="create_user") {
      const email=String(body.email||"").trim().toLowerCase(), password=String(body.password||"");
      const username=String(body.username||"").trim().toLowerCase(), name=String(body.name||"").trim();
      const graduacao=String(body.graduacao||""), re=String(body.re||"").trim();
      const pelotao=String(body.pelotao||"ROCAM").trim()||"ROCAM";
      const role=body.role==="ADMIN"?"admin":body.role==="ADJUNTO"?"adjunto":body.role==="MECANICO"?"mecanico":"operador";
      if (!email || !email.includes("@") || password.length<6 || !username || !name || !re)
        return json({success:false,error:"Nome, usuário, e-mail, RE e senha de no mínimo 6 caracteres são obrigatórios."},400);
      const {data:dupEmail,error:e1}=await client.from("profiles").select("id").ilike("email",email).maybeSingle();
      if(e1) return json({success:false,error:"Não foi possível verificar o e-mail no cadastro de perfis."},500);
      if(dupEmail) return json({success:false,error:"Já existe um perfil cadastrado com este e-mail."},409);
      const {data:dupUser,error:e2}=await client.from("profiles").select("id").eq("username",username).maybeSingle();
      if(e2) return json({success:false,error:"Não foi possível verificar o nome de usuário."},500);
      if(dupUser) return json({success:false,error:"Já existe um usuário com este nome de usuário."},409);
      const {data:dupRe,error:e3}=await client.from("profiles").select("id").eq("re",re).maybeSingle();
      if(e3) return json({success:false,error:"Não foi possível verificar o RE."},500);
      if(dupRe) return json({success:false,error:"Já existe um usuário com este RE."},409);
      const {data:listed,error:listError}=await client.auth.admin.listUsers({page:1,perPage:1000});
      if(listError) return json({success:false,error:"Não foi possível verificar as contas de autenticação."},500);
      let authUser=listed.users.find(u=>(u.email||"").toLowerCase()===email);
      if(!authUser) {
        const {data:created,error:createError}=await client.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:name,username,graduacao,re,pelotao}});
        if(createError || !created.user) {
          if(/already registered|already exists/i.test(createError?.message||"")) {
            const {data:again}=await client.auth.admin.listUsers({page:1,perPage:1000});
            authUser=again?.users.find(u=>(u.email||"").toLowerCase()===email);
          }
          if(!authUser) return json({success:false,error:createError?.message||"Não foi possível criar a conta de autenticação."},400);
        } else authUser=created.user;
      }
      const {error:profileError}=await client.from("profiles").upsert({id:authUser.id,email,username,full_name:name,graduacao,re,pelotao,role,active:true},{onConflict:"id"});
      if(profileError) return json({success:false,userId:authUser.id,error:"A conta de autenticação foi preservada, mas o perfil não foi salvo. Tente novamente para concluir a sincronização. Detalhe: "+profileError.message},500);
      return json({success:true,userId:authUser.id,email});
    }
    if(body.action==="change_password") {
      const {userId,newPassword}=body;
      if(!userId || !newPassword || String(newPassword).length<6) return json({success:false,error:"A nova senha deve ter no mínimo 6 caracteres."},400);
      const {error}=await client.auth.admin.updateUserById(userId,{password:String(newPassword)});
      if(error) return json({success:false,error:error.message},400);
      return json({success:true});
    }
    if(body.action==="set_active") {
      const {userId,active}=body;
      if(!userId || typeof active!=="boolean") return json({success:false,error:"Usuário e status são obrigatórios."},400);
      const {error}=await client.from("profiles").update({active}).eq("id",userId);
      if(error) return json({success:false,error:error.message},400);
      return json({success:true});
    }
    return json({success:false,error:"Ação não suportada."},400);
  } catch(error) {
    const message=error instanceof Error?error.message:"Erro interno ao gerenciar usuário.";
    return json({success:false,error:message},400);
  }
});