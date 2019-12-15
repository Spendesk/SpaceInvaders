import {
  FONT_FAMILY,
  X_MAX,
  Y_MAX,
  VELOCITY,
  VELOCITY_STEP,
  INITIAL_DELAY_BUGS,
  INITIAL_DELAY_RECEIPTS,
  DELAY_STEP_BUGS,
  DELAY_STEP_RECEIPTS,
  PROVIDERS,
} from "./global";
import { injectSlackCard, SlackMember, getUsersList } from './slack';

export default class Level extends Phaser.Scene {
  // marvin properties
  private isMarvinAlive: boolean = true;
  private livesCount = 0;
  private initialLivesCount = 5;
  private livesArray = [];
  private score = 0;
  private scoreText;
  private rulesText1 = "Collect the receipts";
  private rulesText2 = "and avoid bugs!";
  private alphaRules = false;
  private rotation = 0;
  private marvinDamaged = false;
  private lastLevelStart = new Date().valueOf();
  private level = 0;
  private lastBugSent = this.lastLevelStart;
  private lastReceiptSent = this.lastLevelStart;

  private rules1: Phaser.GameObjects.Text;
  private rules2: Phaser.GameObjects.Text;

  private receiptCollectedSounds: any[];
  private bugTouchedSound: any;
  private gameOverSound: any;

  // marvin and bug physics object(s)
  private lives: Phaser.GameObjects.Group;
  private bugs: Phaser.Physics.Arcade.Group;
  private receipts: Phaser.Physics.Arcade.Group;
  private marvin: Phaser.Physics.Arcade.Sprite & {
    body: Phaser.Physics.Arcade.Body;
  };
  private slackMembers: SlackMember[];
  private waitingForProvider: string;

  constructor() {
    super("Level");
    this.addOneBug = this.addOneBug.bind(this);
    this.addOneReceipt = this.addOneReceipt.bind(this);
    this.touchedByBug = this.touchedByBug.bind(this);
    this.setMarvinAllRight = this.setMarvinAllRight.bind(this);
    this.setSlackMembers();
  }

  async setSlackMembers() {
    try {
      this.slackMembers = await getUsersList();
    } catch (error) {
      console.log(error);
    }
  }

  preload() {
    this.load.svg("marvin", "assets/marvin.svg");
    this.load.svg("bug", "assets/bug.svg");
    this.load.svg("life", "assets/heart.svg");
    for (const provider of PROVIDERS) {
      this.load.svg(`receipt-${provider}`, `assets/receipts/${provider}.svg`);
    }
    this.load.svg("spendesk", "assets/spendesk.svg");
    this.load.svg("slack", "assets/slack.svg");
    this.load.audio("receipt_collected_4", "assets/musics/receipt_collected/R2_beeping.mp3");
    this.load.audio("receipt_collected_2", "assets/musics/receipt_collected/Playful_R2D2.mp3");
    this.load.audio("receipt_collected_3", "assets/musics/receipt_collected/R2_beeping_happily.mp3");
    this.load.audio("receipt_collected_1", "assets/musics/receipt_collected/Another_beep.mp3");
    this.load.audio("bug_touched", "assets/musics/bug_touched.mp3");
    this.load.audio("game_over", "assets/musics/game_over.mp3");

    this.isMarvinAlive = true;
  }

  create() {
    // ** NOTE: create() is only called the first time the scene is created
    // it does not get called when scene is restarted or reloaded
    this.setLevel();
    this.setRules();
    this.setSounds();
    this.setMarvin();
    this.setBugs();
    this.setTopBar();
    this.setReceipts();
    this.setRandomSlackCard();
    this.physics.add.overlap(this.bugs, this.marvin, this.touchedByBug, null, this);
    this.physics.add.overlap(this.receipts, this.marvin, this.collectReceipt, null, this);
    this.score = 0;
    this.scoreText = this.add.text(10, 10, 'score: 0', { fontSize: '20px', fill: '#000' });
  }

  async wait (ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve(), ms);
    });
  }

  getRandomInteger(max: number): number {
    return Math.floor(Math.random() * (max + 1));
  }

  getRandomSlackMember(): SlackMember {
    const nbMembers = this.slackMembers.length;
    const slackMember = this.slackMembers[this.getRandomInteger(nbMembers - 1)];
    return slackMember;
  }

  getRandomProviderName(): string {
    const nbProviders = PROVIDERS.length;
    const providerName = PROVIDERS[this.getRandomInteger(nbProviders - 1)];
    return providerName;
  }

  async setRandomSlackCard(nbTries:number = 0) {
    if (!this.slackMembers || !this.slackMembers.length) {
      if (nbTries === 5) {
        throw new Error('Cannot fetch slack members');
      }
      await this.wait(500);
      return this.setRandomSlackCard(nbTries + 1);
    }

    const slackMember = this.getRandomSlackMember();
    const providerName = this.getRandomProviderName();
    this.waitingForProvider = providerName;
    injectSlackCard(
      slackMember.avatarUrl,
      `logos/${providerName}.svg`,
      `${slackMember.firstName || ''} ${slackMember.lastName || ''}`,
    );
  }

  update() {
    if (this.isMarvinAlive) {
      this.setMarvinMovement();
    }
    const now = new Date().valueOf();

    if (now - this.lastLevelStart > 10000) {
      this.level++;
      this.lastLevelStart = now;
    }

    let delayBug = INITIAL_DELAY_BUGS - DELAY_STEP_BUGS * this.level;
    let delayReceipt = INITIAL_DELAY_RECEIPTS - DELAY_STEP_RECEIPTS * this.level;

    // At the beginning, we want to let some time before starting the game to show rules
    if (this.level === 0) {
      delayBug = 7300;
      delayReceipt = 6000;
    }

    if (now - this.lastLevelStart > 6000) {
      this.rules1.setAlpha(0);
      this.rules2.setAlpha(0);
    }

    if (delayBug <= 400) {
      delayBug = 400;
    }

    if (now - this.lastBugSent > delayBug) {
      this.addOneBug();
      this.lastBugSent = now;
    }

    if (delayReceipt <= 300) {
      delayReceipt = 300;
    }

    if (now - this.lastReceiptSent > delayReceipt) {
      this.addOneReceipt();
      this.lastReceiptSent = now;
    }
  }

  private touchedByBug(marvin, bug) {
    if (this.marvinDamaged) {
      return;
    }
    if(this.livesCount) {
      this.bugTouchedSound.play();
    }
    this.bugs.remove(bug, true, true);
    this.removeOneLife();
    if (!this.livesCount) {
      this.marvinDeath();
    } else {
      this.setMarvinDamaged();
      setTimeout(this.setMarvinAllRight, 1000);
    }
  }

  private setRules() {
    this.rules1 = this.add.text(
      this.physics.world.bounds.width / 2,
      this.physics.world.bounds.height / 2 - 60,
      this.rulesText1,
      {
        fontFamily: FONT_FAMILY,
        fontSize: '40px',
        fill: '#fff'
      }
    )
    this.rules2 = this.add.text(
      this.physics.world.bounds.width / 2,
      this.physics.world.bounds.height / 2,
      this.rulesText2,
      {
        fontFamily: FONT_FAMILY,
        fontSize: '40px',
        fill: '#fff'
      }
    )
    this.rules1.setOrigin(0.5);
    this.rules2.setOrigin(0.5);
  }

  private setSounds() {
    this.receiptCollectedSounds = [
      this.sound.add('receipt_collected_1'),
      this.sound.add('receipt_collected_2'),
      this.sound.add('receipt_collected_3'),
      this.sound.add('receipt_collected_4'),
    ]
    this.bugTouchedSound = this.sound.add('bug_touched');
    this.gameOverSound = this.sound.add('game_over');
  }

  private setMarvinDamaged() {
    this.marvin.setAlpha(0.5, 0.5, 0.5, 0.5);
    this.marvinDamaged = true;
  }

  private setMarvinAllRight() {
    this.marvin.setAlpha(1, 1, 1, 1);
    this.marvinDamaged = false;
  }

  private setMarvin() {
    this.marvin = this.physics.add.image(X_MAX / 2, Y_MAX, "marvin") as any;
    this.marvin.setScale(0.7);
    this.marvin.setCollideWorldBounds(true);
    this.isMarvinAlive = true;
    this.marvinDamaged = false;
  }

  private setBugs() {
    this.bugs = this.physics.add.group();
  }

  private setTopBar() {
    this.lives = this.add.group();
    for (let i = 0; i < this.initialLivesCount; i++){
      this.addOneLife();
    }
  }

  private setReceipts() {
    this.receipts = this.physics.add.group();
  }

  private removeOneLife() {
    this.lives.remove(this.livesArray[this.livesCount - 1], true, true)
    this.livesCount--;
  }

  private addOneLife() {
    const image = this.add.image(X_MAX - 20 - this.livesCount * 20, 20, "life");
    image.scale = 0.15;
    this.lives.add(image);
    this.livesArray.push(image);
    this.livesCount++;
  }

  private setMarvinMovement() {
    const cursorKeys = this.input.keyboard.createCursorKeys();

    if (cursorKeys.right.isDown) {
      this.marvin.body.setVelocityX(500);
      if (this.marvin.body.rotation < 15) {
        this.marvin.body.rotation++;
      }
    } else if (cursorKeys.left.isDown) {
      this.marvin.body.setVelocityX(-500);
      if (this.marvin.body.rotation > -15) {
        this.marvin.body.rotation--;
      }
    } else {
      // If pressing nothing then stabilize
      if (this.marvin.body.rotation * Math.sign(this.marvin.body.rotation) < 2) {
        this.marvin.body.rotation = 0;
      }
      if (this.marvin.body.rotation != 0) {
        this.marvin.body.rotation -= Math.sign(this.marvin.body.rotation) * 1;
      }
      this.marvin.body.setVelocity(0);
    }
  }

  private addOneBug() {
    if (this.isMarvinAlive) {
      const x = Phaser.Math.Between(70, 730)
      var bug = this.bugs.create(x, 10, 'bug');
      bug.setScale(0.3);
      bug.setVelocity(0, VELOCITY + this.level * VELOCITY_STEP);
      bug.allowGravity = false;
    }
  }

  private addOneReceipt() {
    if (this.isMarvinAlive) {
      const x = Phaser.Math.Between(70, 730)
      const providerName = this.getRandomProviderName();
      const receipt = this.receipts.create(x, 10, `receipt-${providerName}`);
      receipt.provider = providerName;
      receipt.setScale(0.7);
      receipt.setVelocity(0, VELOCITY + this.level * VELOCITY_STEP);
      receipt.allowGravity = false;
    }
  }

  private collectReceipt(marvin, receipt) {
    receipt.disableBody(true, true);
    if (this.waitingForProvider === receipt.provider) {
      this.receiptCollectedSounds[3].play();
      this.setRandomSlackCard();
      this.score += 10;
    } else {
      this.receiptCollectedSounds[Phaser.Math.Between(0, 2)].play();
      this.score += 1;
    }
    this.scoreText.setText('score: ' + this.score);
  }

  private stopBugs(bugs: Phaser.Physics.Arcade.Group) {
    Phaser.Actions.Call(
      bugs.getChildren(),
      (go: any) => {
        go.setVelocityX(0);
      },
      this
    );
  }

  /**
   * Triggers marvin death as well as stops all movement and sets up
   * game over screen
   */
  private marvinDeath() {
    this.gameOverSound.play();
    this.isMarvinAlive = false;
    this.bugs.clear(true, true);
    this.receipts.clear(true, true);
    this.marvin.body.setVelocityX(0);
    this.stopBugs(this.bugs);
    this.marvin.body.setVelocityX(0);

    //this.cameras.main.shake();

    // add game over screen
    this.setGameOverScreen();
  }

  private setGameOverScreen() {
    const gameOver = this.add.text(
      this.physics.world.bounds.width / 2,
      this.physics.world.bounds.height / 2 - 100,
      "GAME OVER",
      {
        fontFamily: FONT_FAMILY,
        fontSize: "50px",
        fill: "#fff"
      }
    );
    gameOver.setOrigin(0.5);

    const finalScore = this.add.text(
      this.physics.world.bounds.width / 2,
      this.physics.world.bounds.height / 2 - 40,
      `Score: ${this.score}`,
      {
        fontFamily: FONT_FAMILY,
        fontSize: "35px",
        fill: "#fff"
      }
    );
    finalScore.setOrigin(0.5);

    const mainMenuTxt = this.add.text(
      this.physics.world.bounds.width / 2,
      this.physics.world.bounds.height / 2 + 40,
      "Main Menu",
      {
        fontFamily: FONT_FAMILY,
        fontSize: "25px",
        fill: "#59311f"
      }
    );
    mainMenuTxt.setOrigin(0.5);

    mainMenuTxt
      .setInteractive()
      .on("pointerover", () => this.input.setDefaultCursor("pointer"))
      .on("pointerout", () => this.input.setDefaultCursor("auto"))
      .on("pointerdown", () => this.scene.start("MainMenu"));

    const tryAgainTxt = this.add.text(
      this.physics.world.bounds.width / 2,
      this.physics.world.bounds.height / 2 + 80,
      "Try Again",
      {
        fontFamily: FONT_FAMILY,
        fontSize: "25px",
        fill: "#59311f"
      }
    );
    tryAgainTxt.setOrigin(0.5);

    tryAgainTxt
      .setInteractive()
      .on("pointerover", () => this.input.setDefaultCursor("pointer"))
      .on("pointerout", () => this.input.setDefaultCursor("auto"))
      .on("pointerdown", () => this.restart());
  }

  private restart() {
    this.scene.restart();
    this.setLevel();
  }

  private setLevel() {
    this.level = 0;
    this.lastLevelStart = new Date().valueOf();
    this.livesArray = [];
  }
}
