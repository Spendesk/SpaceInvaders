const AVATAR_SELECTOR = '#slack-avatar > image';
const RECEIPT_SELECTOR = '#receipt-logo > image';
const NAME_SELECTOR = '#slack-name';

function findInElement (
  container: any,
  selector: string,
): HTMLElement {
  return container.contentDocument.querySelector(selector);
}

function displaySlackBlock () {
  const slackContainer = document.querySelector('#slack') as HTMLObjectElement;
  slackContainer.style.visibility = 'visible';
}

export function updateSlackAssets (
  avatarUrl: string,
  providerLogoUrl: string,
  userName: string,
): void {
  const slackImg = document.querySelector('#slack-img') as HTMLObjectElement;
  const avatar = findInElement(slackImg, AVATAR_SELECTOR) as unknown as SVGImageElement;
  const receipt = findInElement(slackImg, RECEIPT_SELECTOR) as unknown as SVGImageElement;
  const name = findInElement(slackImg, NAME_SELECTOR);

  avatar.href.baseVal = avatarUrl;
  receipt.href.baseVal = providerLogoUrl;
  name.innerHTML = userName;
}

export function injectSlackCard (
  avatarUrl: string,
  providerLogoUrl: string,
  userName: string,
): void {
  displaySlackBlock();
  updateSlackAssets(avatarUrl, providerLogoUrl, userName);
}