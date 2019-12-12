//TODO: Add a sentence just after click on START GAME (like "Ready? Go!")
import {
  FONT_FAMILY,
  X_MAX,
  Y_MAX
} from "./global";

export default class Level extends Phaser.Scene {
  // marvin properties
  private isMarvinAlive: boolean = true;
  private livesCount = 0;
  private initialLivesCount = 5;
  private livesArray = [];
  private score = 0;

  // marvin and bug physics object(s)
  private lives: Phaser.GameObjects.Group;
  private bugs: Phaser.Physics.Arcade.Group;
  private receipts: Phaser.Physics.Arcade.Group;
  private marvin: Phaser.Physics.Arcade.Sprite & {
    body: Phaser.Physics.Arcade.Body;
  };
  private scoreText;

  constructor() {
    super("Level");
    this.addOneBug = this.addOneBug.bind(this);
    this.addOneReceipt = this.addOneReceipt.bind(this);
    this.touchedByBug = this.touchedByBug.bind(this);
    setInterval((this.addOneBug), 3000);
    setInterval((this.addOneReceipt), 2800);
  }

  preload() {
    this.load.svg("marvin", "assets/marvin.svg");
    this.load.svg("bug", "assets/bug.svg");
    this.load.svg("life", "assets/life.svg");
    this.load.svg("receipt", "assets/receipt.svg")
    this.isMarvinAlive = true;
  }

  create() {
    // ** NOTE: create() is only called the first time the scene is created
    // it does not get called when scene is restarted or reloaded
    this.setMarvin();
    this.setBugs();
    this.setTopBar();
    this.setReceipts();
    this.physics.add.overlap(this.bugs, this.marvin, () => null);
    this.physics.add.overlap(this.receipts, this.marvin, this.collectReceipt, null, this);
    this.score = 0;
    this.scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' });

  }

  update() {
    if (this.isMarvinAlive) {
      this.setMarvinMovement();
    }
  }

  private touchedByBug(marvin, bug) {
    this.bugs.remove(bug, true, true);
    this.removeOneLife();
    console.log('COUNT!', this.livesCount)
    if (!this.livesCount) {
      this.marvinDeath();
    }
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
    image.scale = 0.05;
    this.lives.add(image);
    this.livesArray.push(image);
    this.livesCount++;
  }

  private setMarvinMovement() {
    const cursorKeys = this.input.keyboard.createCursorKeys();

    if (cursorKeys.right.isDown) {
      this.marvin.body.setVelocityX(500);
    } else if (cursorKeys.left.isDown) {
      this.marvin.body.setVelocityX(-500);
    } else {
      this.marvin.body.setVelocity(0);
    }
  }

  private addOneBug() {
    if (this.isMarvinAlive) {
      const x = Phaser.Math.Between(70, 730)
      var bug = this.bugs.create(x, 10, 'bug');
      bug.setScale(0.5);
      bug.setVelocity(0, 200);
      bug.allowGravity = false;
      this.physics.add.overlap(this.marvin, bug, this.touchedByBug);
    }
  }

  private addOneReceipt() {
    if (this.isMarvinAlive) {
      const x = Phaser.Math.Between(70, 730)
      var receipt = this.receipts.create(x, 10, 'receipt');
      receipt.setScale(0.7);
      receipt.setVelocity(0, 300);
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

    this.cameras.main.shake();

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
  }
}
