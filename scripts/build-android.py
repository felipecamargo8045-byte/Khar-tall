#!/usr/bin/env python3
"""Build a signed APK with official Android build tools and the Eclipse compiler.
No Gradle, cloud build, external runtime SDK or payment library is used.
The signing directory MUST remain private and MUST be backed up for future updates.
"""
import argparse, hashlib, json, os, pathlib, shutil, subprocess, tempfile, zipfile
root=pathlib.Path(__file__).resolve().parent.parent
p=argparse.ArgumentParser();p.add_argument('--tools',required=True);p.add_argument('--signing-dir',required=True);p.add_argument('--output',required=True);a=p.parse_args()
tools=pathlib.Path(a.tools).resolve();signing=pathlib.Path(a.signing_dir).resolve();output=pathlib.Path(a.output).resolve()
platform=tools/'platform/android-36/android.jar';build_tools=tools/'build-tools/android-16';ecj=tools/'ecj.jar'
for file in [platform,build_tools/'aapt2',build_tools/'lib/d8.jar',build_tools/'apksigner',build_tools/'zipalign',ecj]:
 if not file.is_file():raise SystemExit('Missing Android tool: '+str(file))
for file in [build_tools/'aapt2',build_tools/'apksigner',build_tools/'zipalign']:file.chmod(file.stat().st_mode|0o111)
def run(args):subprocess.run([str(v) for v in args],check=True)
run(['node',root/'scripts/prepare-app.js'])
signing.mkdir(parents=True,exist_ok=True);signing.chmod(0o700);keystore=signing/'khar-tall-release.p12';password_file=signing/'password.txt'
if not keystore.exists():
 if password_file.exists():raise SystemExit('Existing password without keystore; inspect the private signing backup.')
 password_file.write_text(os.urandom(32).hex());password_file.chmod(0o600)
 run(['keytool','-genkeypair','-keystore',keystore,'-storetype','PKCS12','-storepass:file',password_file,'-keypass:file',password_file,'-alias','khar-tall','-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=Khar Tall,OU=Android,O=Khar Tall,C=BR'])
 keystore.chmod(0o600)
with tempfile.TemporaryDirectory(prefix='kt-android-') as tmp:
 work=pathlib.Path(tmp);assets=work/'assets';web=assets/'web';res=work/'res/drawable';classes=work/'classes';dex=work/'dex'
 for directory in [web,res,classes,dex]:directory.mkdir(parents=True,exist_ok=True)
 files=['index.html','online.html','conta.html','privacidade.html','loja.html','painel-loja.html','instalar.html','style.css','online.css','account.css','store.css','app-shell.css','audio.js','engine.js','app.js','online.js','auth-client.js','account.js','app-shell.js','store-client.js','store-admin.js','install.js','manifest.webmanifest']
 routes={}
 for file in files:shutil.copyfile(root/file,web/file);routes['/'+file]=file
 for url,file in {'/':'index.html','/online':'online.html','/conta':'conta.html','/loja':'loja.html','/painel-loja':'painel-loja.html','/instalar':'instalar.html'}.items():routes[url]=file
 for folder in ['assets','icons']:
  (web/folder).mkdir()
  for file in sorted((root/folder).iterdir()):
   if file.is_file() and file.suffix in ['.png','.webp','.wav']:
    shutil.copyfile(file,web/folder/file.name);routes['/'+folder+'/'+file.name]=folder+'/'+file.name
 (assets/'routes.json').write_text(json.dumps(routes,separators=(',',':')))
 shutil.copyfile(root/'icons/icon-512.png',res/'icon.png')
 resources=work/'resources.zip';unsigned=work/'unsigned.apk';aligned=work/'aligned.apk'
 run([build_tools/'aapt2','compile','--dir',work/'res','-o',resources])
 run([build_tools/'aapt2','link','-o',unsigned,'-I',platform,'--manifest',root/'android/AndroidManifest.xml','-A',assets,'-R',resources,'--min-sdk-version','26','--target-sdk-version','36','--version-code','350','--version-name','3.5.0'])
 sources=sorted((root/'android/src').rglob('*.java'))
 run(['java','-jar',ecj,'-8','-encoding','UTF-8','-bootclasspath',str(platform)+os.pathsep+str(build_tools/'core-lambda-stubs.jar'),'-d',classes,*sources])
 jar=work/'classes.jar'
 with zipfile.ZipFile(jar,'w')as z:
  for file in classes.rglob('*.class'):z.write(file,file.relative_to(classes))
 run(['java','-cp',build_tools/'lib/d8.jar','com.android.tools.r8.D8','--min-api','26','--lib',platform,'--output',dex,jar])
 with zipfile.ZipFile(unsigned,'a',compression=zipfile.ZIP_DEFLATED)as z:z.write(dex/'classes.dex','classes.dex')
 run([build_tools/'zipalign','-f','-p','4',unsigned,aligned]);output.parent.mkdir(parents=True,exist_ok=True)
 run([build_tools/'apksigner','sign','--ks',keystore,'--ks-key-alias','khar-tall','--ks-pass','file:'+str(password_file),'--out',output,aligned])
 run([build_tools/'apksigner','verify','--verbose','--print-certs',output])
 with zipfile.ZipFile(output)as z:
  for url,file in routes.items():assert z.read('assets/web/'+file)==(root/file).read_bytes(),file+' changed in APK'
  assert not any('/server.js' in x or '/.env' in x or x.endswith('.p12') for x in z.namelist())
 fingerprint=subprocess.check_output(['keytool','-exportcert','-keystore',keystore,'-storepass:file',password_file,'-alias','khar-tall'])
 sha=hashlib.sha256(fingerprint).hexdigest().upper();certificate=':'.join(sha[i:i+2]for i in range(0,len(sha),2))
 (root/'assetlinks.json').write_text(json.dumps([{'relation':['delegate_permission/common.handle_all_urls'],'target':{'namespace':'android_app','package_name':'br.com.khartall.jogo','sha256_cert_fingerprints':[certificate]}}],indent=2)+'\n')
 metadata={'file':output.name,'version':'3.5.0','version_code':350,'min_android':'8.0','size':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'certificate_sha256':certificate,'media_verified':True}
 output.with_suffix('.json').write_text(json.dumps(metadata,indent=2)+'\n');print(json.dumps(metadata))
