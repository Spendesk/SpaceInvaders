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
} from "./global";

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

  // marvin and bug physics object(s)
  private lives: Phaser.GameObjects.Group;
  private bugs: Phaser.Physics.Arcade.Group;
  private receipts: Phaser.Physics.Arcade.Group;
  private marvin: Phaser.Physics.Arcade.Sprite & {
    body: Phaser.Physics.Arcade.Body;
  };

  constructor() {
    super("Level");
    this.addOneBug = this.addOneBug.bind(this);
    this.addOneReceipt = this.addOneReceipt.bind(this);
    this.touchedByBug = this.touchedByBug.bind(this);
    this.setMarvinAllRight = this.setMarvinAllRight.bind(this);
  
  }

  preload() {
    this.load.svg("marvin", "assets/marvin.svg");
    this.load.svg("bug", "assets/bug.svg");
    this.load.svg("life", "assets/heart.svg");
    this.load.svg("receipt", "assets/receipt.svg")
    this.load.svg("spendesk", "assets/spendesk.svg")
    this.load.svg("slack", "assets/slack.svg")
    this.isMarvinAlive = true;
  }

  create() {
    // ** NOTE: create() is only called the first time the scene is created
    // it does not get called when scene is restarted or reloaded
    this.rules1 = this.add.text(
      this.physics.world.bounds.width / 2,
      this.physics.world.bounds.height / 2 - 60,
      this.rulesText1,
      {
        fontSize: '40px',
        fill: '#fff'
      }
    )
    this.rules2 = this.add.text(
      this.physics.world.bounds.width / 2,
      this.physics.world.bounds.height / 2,
      this.rulesText2,
      {
        fontSize: '40px',
        fill: '#fff'
      }
    )
    this.rules1.setOrigin(0.5);
    this.rules2.setOrigin(0.5);

    this.setMarvin();
    this.setBugs();
    this.setTopBar();
    this.setReceipts();
    //this.setSlackCard();
    
    this.physics.add.overlap(this.bugs, this.marvin, this.touchedByBug, null, this);
    this.physics.add.overlap(this.receipts, this.marvin, this.collectReceipt, null, this);
    this.score = 0;
    this.scoreText = this.add.text(10, 10, 'score: 0', { fontSize: '20px', fill: '#000' });
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

  private setSlackCard() {
    const image = this.add.image(X_MAX / 2 - 280, Y_MAX - 50, "slack");
    image.setScale(0.6);
  }

  private touchedByBug(marvin, bug) {
    if (this.marvinDamaged) {
      return;
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
      var receipt = this.receipts.create(x, 10, 'receipt');
      receipt.setScale(0.7);
      receipt.setVelocity(0, VELOCITY + this.level * VELOCITY_STEP);
      receipt.allowGravity = false;
    }
  }

  private collectReceipt(marvin, receipt) {
    receipt.disableBody(true, true);
    this.score += 1;
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

    const mainMenuTxt = this.add.text(
      this.physics.world.bounds.width / 2,
      this.physics.world.bounds.height / 2,
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
      this.physics.world.bounds.height / 2 + 40,
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
    this.isMarvinAlive = true;
    this.livesArray = [];
    this.level = 0;
    this.marvinDamaged = false;
    this.lastLevelStart = new Date().valueOf();
  }
}
