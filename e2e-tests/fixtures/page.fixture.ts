/**
 * page.fixture.ts
 *
 * Extends the base Playwright `test` with typed POM instances so every test
 * can destructure the pages it needs without manual instantiation.
 *
 * Usage in a test:
 *   import { test, expect } from '@fixtures/index';
 *   test('dashboard loads', async ({ dashboardPage }) => { ... });
 */

import { test as base } from '@playwright/test';

// Import all page objects
import { SignInPage } from '../pages/auth/sign-in.page';
import { SignUpPage } from '../pages/auth/sign-up.page';
import { OnboardingPage } from '../pages/onboarding/onboarding.page';
import { DashboardPage } from '../pages/dashboard/dashboard.page';
import { BrowsePage } from '../pages/browse/browse.page';
import { ProfilePage } from '../pages/profile/profile.page';
import { ChatPage } from '../pages/chat/chat.page';
import { CreateStudyRoomPage } from '../pages/study-room/create-room.page';
import { StudyRoomPage } from '../pages/study-room/study-room.page';
import { RequestSessionPage } from '../pages/sessions/request-session.page';
import { NotificationsPage } from '../pages/notifications/notifications.page';

// Import component objects
import { NavbarComponent } from '../components/navbar.component';
import { ModalComponent } from '../components/modal.component';
import { ToastComponent } from '../components/toast.component';

type PageFixtures = {
  signInPage: SignInPage;
  signUpPage: SignUpPage;
  onboardingPage: OnboardingPage;
  dashboardPage: DashboardPage;
  browsePage: BrowsePage;
  profilePage: ProfilePage;
  chatPage: ChatPage;
  createStudyRoomPage: CreateStudyRoomPage;
  studyRoomPage: StudyRoomPage;
  requestSessionPage: RequestSessionPage;
  notificationsPage: NotificationsPage;
  navbar: NavbarComponent;
  modal: ModalComponent;
  toast: ToastComponent;
};

export const test = base.extend<PageFixtures>({
  signInPage: async ({ page }, use) => { await use(new SignInPage(page)); },
  signUpPage: async ({ page }, use) => { await use(new SignUpPage(page)); },
  onboardingPage: async ({ page }, use) => { await use(new OnboardingPage(page)); },
  dashboardPage: async ({ page }, use) => { await use(new DashboardPage(page)); },
  browsePage: async ({ page }, use) => { await use(new BrowsePage(page)); },
  profilePage: async ({ page }, use) => { await use(new ProfilePage(page)); },
  chatPage: async ({ page }, use) => { await use(new ChatPage(page)); },
  createStudyRoomPage: async ({ page }, use) => { await use(new CreateStudyRoomPage(page)); },
  studyRoomPage: async ({ page }, use) => { await use(new StudyRoomPage(page)); },
  requestSessionPage: async ({ page }, use) => { await use(new RequestSessionPage(page)); },
  notificationsPage: async ({ page }, use) => { await use(new NotificationsPage(page)); },
  navbar: async ({ page }, use) => { await use(new NavbarComponent(page)); },
  modal: async ({ page }, use) => { await use(new ModalComponent(page)); },
  toast: async ({ page }, use) => { await use(new ToastComponent(page)); },
});

export { expect } from '@playwright/test';
