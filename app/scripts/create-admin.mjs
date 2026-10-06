/**
 * Provisionne un compte administrateur Q2M.
 *
 * Le SDK n'expose aucune API d'administration des utilisateurs : le compte est
 * donc cree via auth.signUp avec le client admin, puis promu dans public.profiles
 * (ecriture impossible depuis le client : GRANT columnaire + RLS force
 * role = 'CUSTOMER').
 *
 *   node scripts/create-admin.mjs <email> <motdepasse> [ prenom ] [ nom ]
 *
 * InsForge exige la verification de l'email : tant qu'elle n'est pas faite,
 * signUp ne renvoie pas d'uuid et signInWithPassword repond 403. Le script
 * s'arrete donc volontairement dans ce cas et affiche la commande SQL exacte a
 * executer via le CLI InsForge plutot que de deviner un profil.
 */
import { readFileSync } from 'node:fs';
import { createAdminClient } from '@insforge/sdk';

const [, , emailArg, passwordArg, firstName = 'Q2M', lastName = 'Admin'] =
  process.argv;

if (!emailArg || !passwordArg) {
  console.error(
    'Usage : node scripts/create-admin.mjs <email> <motdepasse> [prenom] [nom]',
  );
  process.exit(1);
}

// Charge .env.local sans dependre de dotenv.
const envFile = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of envFile.split(/\r?\n/)) {
  const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const baseUrl = process.env.INSFORGE_URL;
const apiKey = process.env.INSFORGE_API_KEY;
if (!baseUrl || !apiKey) {
  console.error('INSFORGE_URL / INSFORGE_API_KEY absents de .env.local');
  process.exit(1);
}

const admin = createAdminClient({ baseUrl, apiKey });

/**
 * signInWithPassword ecrase le token du client par celui de l'utilisateur, qui
 * n'a aucun droit sur la colonne role. La promotion doit donc repasser par un
 * client admin neuf.
 */
function freshAdminClient() {
  return createAdminClient({ baseUrl, apiKey });
}

function sqlPending() {
  console.error(`
Email non verifie : impossible de promouvoir le profil sans l'uuid du compte.

Executez cette commande depuis la racine du projet :

  npx insforge db query "update auth.users set email_verified = true where email = '${emailArg}'"

Puis relancez ce script : il promotionnera le profil tout seul.
`);
  process.exit(1);
}

// 1. Creation du compte d'authentification (ignoree si deja existant).
console.log(`> creation du compte ${emailArg}`);
const { data: created, error: signUpError } = await admin.auth.signUp({
  email: emailArg,
  password: passwordArg,
});

if (signUpError) {
  const alreadyExists = /exist|already|taken|duplicate/i.test(signUpError.message ?? '');
  if (!alreadyExists) {
    console.error('Echec de la creation :', signUpError.message);
    process.exit(1);
  }
  console.log('  compte deja present, on continue');
}

// 2. Recuperation de l'uuid. signUp ne le renvoie que si l'email est deja
// verifie ; sinon on ne peut pas deviner a quel profil appartient l'adresse.
let userId = created?.user?.id;

if (!userId) {
  const { data: signedIn, error: signInError } =
    await admin.auth.signInWithPassword({
      email: emailArg,
      password: passwordArg,
    });

  if (signInError || !signedIn?.user?.id) {
    console.log('  email non verifie, promotion suspendue');
    sqlPending();
  }
  userId = signedIn.user.id;
}
console.log(`  uuid = ${userId}`);

// 3. Le trigger AFTER INSERT cree le profil en CUSTOMER ; on le promeut.
const promoter = freshAdminClient();
const { error: roleError } = await promoter.database
  .from('profiles')
  .update({ role: 'ADMIN', first_name: firstName, last_name: lastName })
  .eq('user_id', userId);

if (roleError) {
  console.error('Echec de la promotion :', roleError.message);
  process.exit(1);
}

// 4. Verification.
const { data: check, error: checkError } = await freshAdminClient().database
  .from('profiles')
  .select('user_id,first_name,last_name,role')
  .eq('user_id', userId)
  .maybeSingle();

if (checkError) {
  console.error('Verification impossible :', checkError.message);
  process.exit(1);
}
if (check?.role !== 'ADMIN') {
  console.error(`Promotion echouee, role = ${check?.role}`);
  process.exit(1);
}

console.log('\nCompte administrateur provisionne :');
console.log(`  email  : ${emailArg}`);
console.log(`  role   : ${check.role}`);
console.log(`  profil : ${JSON.stringify(check)}`);
