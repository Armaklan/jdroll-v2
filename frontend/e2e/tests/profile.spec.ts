import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Profil public des membres
 * 1. Le profil d'un membre (nom, avatar, description, titre, absence courante)
 *    est accessible en cliquant sur son pseudo dans la liste des derniers inscrits
 * 2. Le pseudo est cliquable dans la liste des gens en ligne
 * 3. Le pseudo de l'auteur du dernier message est cliquable dans le forum général
 * 4. Les pseudos sont cliquables dans le forum d'une campagne
 *    (auteur du dernier message, membres absents)
 */

interface AuthResponse {
  token: string;
  user: { id: number; username: string };
}

async function registerUser(request: APIRequestContext, username: string, password: string): Promise<AuthResponse> {
  const response = await request.post('/api/auth/register', {
    data: {
      username,
      mail: `${username.toLowerCase()}@example.com`,
      password,
    },
  });
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Échec de l'inscription de ${username} (${response.status()}): ${body}`);
  }
  return response.json();
}

async function setBrowserToken(page: import('@playwright/test').Page, token: string): Promise<void> {
  await page.goto('/');
  await page.evaluate((t) => {
    localStorage.setItem('jdroll_token', t);
  }, token);
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function declareCurrentAbsence(request: APIRequestContext, token: string, commentaire: string): Promise<void> {
  const today = new Date();
  const inTwoDays = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
  const response = await request.post('/api/absences', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      beginDate: toDateString(today),
      endDate: toDateString(inTwoDays),
      commentaire,
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

test.describe('Profil public', () => {
  test("le profil d'un membre est accessible depuis les derniers inscrits de l'accueil", async ({ page, request }) => {
    const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const password = 'Password123';
    const viewer = await registerUser(request, `e2e_prof_view_${suffix}`, password);
    const target = await registerUser(request, `e2e_prof_tgt_${suffix}`, password);

    // Le membre cible s'est réellement connecté (visible dans les derniers inscrits)
    const targetLogin = await request.post('/api/auth/login', {
      data: { username: target.user.username, password },
    });
    expect(targetLogin.ok(), await targetLogin.text()).toBeTruthy();

    // Le membre cible complète son profil et déclare une absence en cours
    const profileResponse = await request.put('/api/auth/profile', {
      headers: { Authorization: `Bearer ${target.token}` },
      data: {
        description: '<p>Vieux rôliste du dimanche</p>',
        titre: 'Conteur émérite',
      },
    });
    expect(profileResponse.ok()).toBeTruthy();
    await declareCurrentAbsence(request, target.token, 'Congés bien mérités');

    // Le visiteur connecté consulte la liste des derniers inscrits
    await setBrowserToken(page, viewer.token);
    await page.goto('/');

    const pseudoLink = page
      .getByTestId('home-stats-registrations')
      .getByRole('link', { name: target.user.username });
    await expect(pseudoLink).toBeVisible();
    await pseudoLink.click();

    // Le profil public affiche les informations du membre
    await expect(page).toHaveURL(new RegExp(`/users/${target.user.id}$`));
    const profile = page.getByTestId('user-profile');
    await expect(profile).toContainText(target.user.username);
    await expect(profile).toContainText('Conteur émérite');
    await expect(profile).toContainText('Vieux rôliste du dimanche');
    await expect(page.getByTestId('user-profile-current-absences')).toContainText('Congés bien mérités');
  });

  test("les derniers inscrits n'affichent que les membres qui se sont déjà connectés", async ({ page, request }) => {
    const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const password = 'Password123';
    const neverLoggedIn = await registerUser(request, `e2e_prof_nl_${suffix}`, password);
    const loggedIn = await registerUser(request, `e2e_prof_li_${suffix}`, password);

    // Un seul des deux membres s'est réellement connecté
    const loginResponse = await request.post('/api/auth/login', {
      data: { username: loggedIn.user.username, password },
    });
    expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();

    const registrations = page.getByTestId('home-stats-registrations');
    await setBrowserToken(page, loggedIn.token);
    await page.goto('/');

    await expect(registrations.getByRole('link', { name: loggedIn.user.username })).toBeVisible();
    await expect(registrations.getByRole('link', { name: neverLoggedIn.user.username })).toHaveCount(0);
  });

  test("le pseudo est cliquable dans la liste des gens en ligne", async ({ page, request }) => {
    const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    // Le préfixe "a" garantit que ce membre apparaît dans les 8 premiers de la liste triée
    const viewer = await registerUser(request, `a_e2e_prof_on_${suffix}`, 'Password123');

    await setBrowserToken(page, viewer.token);
    await page.goto('/');

    const onlineLink = page
      .getByTestId('home-stats-online')
      .getByRole('link', { name: viewer.user.username });
    await expect(onlineLink).toBeVisible();
    await onlineLink.click();

    await expect(page).toHaveURL(new RegExp(`/users/${viewer.user.id}$`));
    await expect(page.getByTestId('user-profile')).toContainText(viewer.user.username);
  });

  test("le pseudo de l'auteur du dernier message est cliquable dans le forum général", async ({ page, request }) => {
    const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const password = 'Password123';
    const viewer = await registerUser(request, `e2e_prof_fv_${suffix}`, password);
    const target = await registerUser(request, `e2e_prof_ft_${suffix}`, password);

    // Le membre cible crée un sujet avec un message dans une section du forum général
    const forumResponse = await request.get('/api/forum');
    expect(forumResponse.ok()).toBeTruthy();
    const { sections } = await forumResponse.json();
    expect(sections.length).toBeGreaterThan(0);
    const sectionId = sections[0].id;

    const topicResponse = await request.post(`/api/sections/${sectionId}/topics`, {
      headers: { Authorization: `Bearer ${target.token}` },
      data: {
        title: `Sujet profil ${suffix}`,
        firstPostContent: 'Premier message du sujet de test',
      },
    });
    expect(topicResponse.ok(), await topicResponse.text()).toBeTruthy();

    // Le visiteur ouvre le forum général et clique sur le pseudo de l'auteur
    await setBrowserToken(page, viewer.token);
    await page.goto('/forum/0');

    const pseudoLink = page
      .getByRole('link', { name: target.user.username })
      .first();
    await expect(pseudoLink).toBeVisible();
    await pseudoLink.click();

    await expect(page).toHaveURL(new RegExp(`/users/${target.user.id}$`));
    await expect(page.getByTestId('user-profile')).toContainText(target.user.username);
  });

  test("les pseudos sont cliquables dans le forum d'une campagne (absences, dernier message)", async ({ page, request }) => {
    const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const password = 'Password123';
    const viewer = await registerUser(request, `e2e_prof_cv_${suffix}`, password);
    const mj = await registerUser(request, `e2e_prof_cm_${suffix}`, password);

    // Le MJ crée une campagne, une section, un sujet et un message
    const createResponse = await request.post('/api/campaigns', {
      headers: { Authorization: `Bearer ${mj.token}` },
      data: {
        name: `Campagne profil ${suffix}`,
        systeme: 'D&D 5e',
        univers: 'Test',
        description: 'Campagne de test du profil public',
        nbJoueurs: 4,
      },
    });
    expect(createResponse.ok(), await createResponse.text()).toBeTruthy();
    const { campaign } = await createResponse.json();

    const sectionResponse = await request.post(`/api/campaigns/${campaign.id}/sections`, {
      headers: { Authorization: `Bearer ${mj.token}` },
      data: { title: `Section profil ${suffix}` },
    });
    expect(sectionResponse.ok(), await sectionResponse.text()).toBeTruthy();
    const { section } = await sectionResponse.json();

    const topicResponse = await request.post(`/api/sections/${section.id}/topics`, {
      headers: { Authorization: `Bearer ${mj.token}` },
      data: {
        title: `Sujet profil ${suffix}`,
        firstPostContent: 'Premier message du sujet de campagne',
      },
    });
    expect(topicResponse.ok(), await topicResponse.text()).toBeTruthy();

    // Le MJ déclare une absence en cours
    await declareCurrentAbsence(request, mj.token, 'Tournée de festivals');

    // Le visiteur rejoint la campagne (validé par le MJ) pour voir le forum de partie
    const joinResponse = await request.post(`/api/campaigns/${campaign.id}/join`, {
      headers: { Authorization: `Bearer ${viewer.token}` },
    });
    expect(joinResponse.ok(), await joinResponse.text()).toBeTruthy();

    const acceptResponse = await request.post(`/api/campaigns/${campaign.id}/participants/${viewer.user.id}/accept`, {
      headers: { Authorization: `Bearer ${mj.token}` },
    });
    expect(acceptResponse.ok(), await acceptResponse.text()).toBeTruthy();

    // Le visiteur ouvre le forum de la campagne
    await setBrowserToken(page, viewer.token);
    await page.goto(`/campaigns/${campaign.id}`);

    // Le pseudo du MJ absent est cliquable dans le bandeau des absences
    const absenceLink = page
      .getByTestId('campaign-absences-banner')
      .getByRole('link', { name: mj.user.username });
    await expect(absenceLink).toBeVisible();
    await absenceLink.click();
    await expect(page).toHaveURL(new RegExp(`/users/${mj.user.id}$`));
    await expect(page.getByTestId('user-profile')).toContainText(mj.user.username);

    // Le pseudo de l'auteur du dernier message est cliquable
    await page.goto(`/campaigns/${campaign.id}`);
    const lastPostLink = page
      .getByRole('link', { name: mj.user.username })
      .first();
    await expect(lastPostLink).toBeVisible();
    await lastPostLink.click();
    await expect(page).toHaveURL(new RegExp(`/users/${mj.user.id}$`));
  });

  test("le pseudo de l'auteur d'un message est cliquable dans la page d'un sujet du forum général", async ({ page, request }) => {
    const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const password = 'Password123';
    const viewer = await registerUser(request, `e2e_prof_tv_${suffix}`, password);
    const target = await registerUser(request, `e2e_prof_tt_${suffix}`, password);

    // Le membre cible crée un sujet avec un message dans une section du forum général
    const forumResponse = await request.get('/api/forum');
    expect(forumResponse.ok()).toBeTruthy();
    const { sections } = await forumResponse.json();
    const sectionId = sections[0].id;

    const topicResponse = await request.post(`/api/sections/${sectionId}/topics`, {
      headers: { Authorization: `Bearer ${target.token}` },
      data: {
        title: `Sujet page sujet ${suffix}`,
        firstPostContent: "Message de l'auteur du sujet",
      },
    });
    expect(topicResponse.ok(), await topicResponse.text()).toBeTruthy();
    const { topic } = await topicResponse.json();

    // Le visiteur ouvre la page du sujet et clique sur le pseudo de l'auteur du message
    await setBrowserToken(page, viewer.token);
    await page.goto(`/forum/0/${topic.id}`);

    const pseudoLink = page.getByRole('link', { name: target.user.username }).first();
    await expect(pseudoLink).toBeVisible();
    await pseudoLink.click();

    await expect(page).toHaveURL(new RegExp(`/users/${target.user.id}$`));
    await expect(page.getByTestId('user-profile')).toContainText(target.user.username);
  });

  test("le pseudo du joueur affiché sous un personnage est cliquable dans la page d'un sujet", async ({ page, request }) => {
    const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const password = 'Password123';
    const viewer = await registerUser(request, `e2e_prof_pv_${suffix}`, password);
    const mj = await registerUser(request, `e2e_prof_pm_${suffix}`, password);

    // Le MJ crée une campagne, une section, un personnage et un sujet
    const createResponse = await request.post('/api/campaigns', {
      headers: { Authorization: `Bearer ${mj.token}` },
      data: {
        name: `Campagne page sujet ${suffix}`,
        systeme: 'D&D 5e',
        univers: 'Test',
        description: 'Campagne de test du profil dans les sujets',
        nbJoueurs: 4,
      },
    });
    expect(createResponse.ok(), await createResponse.text()).toBeTruthy();
    const { campaign } = await createResponse.json();

    const sectionResponse = await request.post(`/api/campaigns/${campaign.id}/sections`, {
      headers: { Authorization: `Bearer ${mj.token}` },
      data: { title: `Section page sujet ${suffix}` },
    });
    expect(sectionResponse.ok(), await sectionResponse.text()).toBeTruthy();
    const { section } = await sectionResponse.json();

    const characterResponse = await request.post(`/api/campaigns/${campaign.id}/characters`, {
      headers: { Authorization: `Bearer ${mj.token}` },
      data: {
        name: `Personnage ${suffix}`,
        concept: 'Héros de test',
        userId: mj.user.id,
      },
    });
    expect(characterResponse.ok(), await characterResponse.text()).toBeTruthy();
    const character = await characterResponse.json();

    const topicResponse = await request.post(`/api/sections/${section.id}/topics`, {
      headers: { Authorization: `Bearer ${mj.token}` },
      data: {
        title: `Sujet perso ${suffix}`,
        firstPostContent: 'Premier message',
      },
    });
    expect(topicResponse.ok(), await topicResponse.text()).toBeTruthy();
    const { topic } = await topicResponse.json();

    // Le MJ poste un message incarné par son personnage
    const postResponse = await request.post(`/api/topics/${topic.id}/posts`, {
      headers: { Authorization: `Bearer ${mj.token}` },
      data: {
        content: 'Message incarné par le personnage',
        persoId: character.id,
      },
    });
    expect(postResponse.ok(), await postResponse.text()).toBeTruthy();

    // Le visiteur rejoint la campagne (validé par le MJ)
    const joinResponse = await request.post(`/api/campaigns/${campaign.id}/join`, {
      headers: { Authorization: `Bearer ${viewer.token}` },
    });
    expect(joinResponse.ok()).toBeTruthy();
    const acceptResponse = await request.post(`/api/campaigns/${campaign.id}/participants/${viewer.user.id}/accept`, {
      headers: { Authorization: `Bearer ${mj.token}` },
    });
    expect(acceptResponse.ok()).toBeTruthy();

    // Le visiteur ouvre la page du sujet : le message affiche le nom du personnage
    // et le pseudo du joueur, cliquable vers le profil
    await setBrowserToken(page, viewer.token);
    await page.goto(`/forum/${campaign.id}/${topic.id}`);

    const pseudoLink = page.getByRole('link', { name: mj.user.username }).first();
    await expect(pseudoLink).toBeVisible();
    await pseudoLink.click();

    await expect(page).toHaveURL(new RegExp(`/users/${mj.user.id}$`));
    await expect(page.getByTestId('user-profile')).toContainText(mj.user.username);
  });
});

test.describe("Affectation d'un titre par un administrateur", () => {
  test("un membre standard ne voit pas le formulaire d'affectation et reçoit 403 via l'API", async ({ page, request }) => {
    const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const password = 'Password123';
    const viewer = await registerUser(request, `e2e_titre_v_${suffix}`, password);
    const target = await registerUser(request, `e2e_titre_t_${suffix}`, password);

    // L'API refuse l'affectation par un non-admin
    const assignResponse = await request.put(`/api/users/${target.user.id}/titre`, {
      headers: { Authorization: `Bearer ${viewer.token}` },
      data: { titre: 'Escroc' },
    });
    expect(assignResponse.status()).toBe(403);

    // La page de profil n'expose pas le formulaire d'affectation
    await setBrowserToken(page, viewer.token);
    await page.goto(`/users/${target.user.id}`);

    await expect(page.getByTestId('user-profile')).toContainText(target.user.username);
    await expect(page.getByTestId('user-profile-assign-title')).toHaveCount(0);
  });

  test("un administrateur affecte un titre depuis le profil d'un membre", async ({ page, request }) => {
    const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const target = await registerUser(request, `e2e_titre_at_${suffix}`, 'Password123');

    // Connexion avec le compte administrateur pré-créé par le seed (profil 2)
    const adminLogin = await request.post('/api/auth/login', {
      data: { username: 'admin', password: 'password' },
    });
    expect(adminLogin.ok(), await adminLogin.text()).toBeTruthy();
    const admin = await adminLogin.json();

    await setBrowserToken(page, admin.token);
    await page.goto(`/users/${target.user.id}`);

    // Le formulaire d'affectation est visible et pré-rempli
    const titreInput = page.getByTestId('user-profile-titre-input');
    await expect(titreInput).toBeVisible();
    await titreInput.fill('Conteur émérite');
    await page.getByTestId('user-profile-titre-save').click();

    // Le titre est affecté et affiché dans l'en-tête du profil
    const profile = page.getByTestId('user-profile');
    await expect(profile).toContainText('Conteur émérite');

    // Le titre est persisté côté API
    const profileResponse = await request.get(`/api/users/${target.user.id}/profile`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    expect(profileResponse.ok()).toBeTruthy();
    const { profile: fetched } = await profileResponse.json();
    expect(fetched.titre).toBe('Conteur émérite');
  });
});
