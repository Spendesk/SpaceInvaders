import { FONT_FAMILY, X_MAX, Y_MAX } from "./global";
export default class MainMenu extends Phaser.Scene {
  private readonly HEADER_TEXT = "Marvin's life";
  private startGameTxt: Phaser.GameObjects.Text;
  private alphaStart = 1;
  private alphaStartIncrease = false;
  private marvin: Phaser.Physics.Arcade.Sprite & {
    body: Phaser.Physics.Arcade.Body;
  };

  constructor() {
    super("MainMenu");
  }

  preload() {
    this.load.svg("marvin", "assets/marvin.svg");
    this.load.svg("spendesk", "assets/spendesk.svg")
  }

  create() {
    const header = this.add.text(
      this.physics.world.bounds.width / 2,
      this.physics.world.bounds.height / 2 - 100,
      this.HEADER_TEXT,
      {
        fontFamily: FONT_FAMILY,
        fontSize: "50px",
        fill: "#fff"
      }
    );
    const spendesk = this.add.image(X_MAX - 40, Y_MAX - 40, "spendesk") as any;
    spendesk.setScale(0.2);
    this.marvin = this.physics.add.image(X_MAX / 2 - 50, Y_MAX / 1.3, "marvin") as any;
    header.setOrigin(0.5);
    this.marvin.body.setVelocityX(150);
    this.marvin.body.setAcceleration(-100, 0);

    this.startGameTxt = this.add.text(
      this.physics.world.bounds.width / 2,
      this.physics.world.bounds.height / 2,
      "START GAME",
      {
        fontFamily: FONT_FAMILY,
        fontSize: "25px",
        fill: "#59311f"
      }
    );
    this.startGameTxt.setOrigin(0.5);

    this.startGameTxt
      .setInteractive()
      .on("pointerover", () => this.input.setDefaultCursor("pointer"))
      .on("pointerout", () => this.input.setDefaultCursor("auto"))
      .on("pointerdown", () => {
        this.scene.start("Level");
      });
  }

  update() {
    // Start text
    if (!this.startGameTxt) {
      return;
    }
    if (this.alphaStartIncrease) {
      this.alphaStart += 0.01;
      if (this.alphaStart > 1) {
        this.alphaStart = 1;
        this.alphaStartIncrease = false;
      }
    } else {
      this.alphaStart -= 0.01;
      if (this.alphaStart < 0.5) {
        this.alphaStart = 0.5;
        this.alphaStartIncrease = true;
      }
    }
    this.startGameTxt.setAlpha(this.alphaStart);

    // Marvin
    if (this.marvin.body.acceleration.x > 0 && this.marvin.body.velocity.x > 0) {
      this.marvin.body.acceleration.x = this.marvin.body.acceleration.x * -1;
      this.marvin.body.setVelocityX(150);
    }
    if (this.marvin.body.acceleration.x < 0 && this.marvin.body.velocity.x < 0) {
      this.marvin.body.acceleration.x = this.marvin.body.acceleration.x * -1;
      this.marvin.body.setVelocityX(-150);
    }
    if (this.marvin.body.velocity.x > 0 && this.marvin.body.rotation < 10) {
      this.marvin.body.rotation += 0.3;
    }
    if (this.marvin.body.velocity.x < 0 && this.marvin.body.rotation > -10) {
      this.marvin.body.rotation -= 0.3;
    }
  }
}
