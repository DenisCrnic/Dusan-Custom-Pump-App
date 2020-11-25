import { LoadingController, Platform } from "@ionic/angular";
import { Component } from "@angular/core";

interface Time {
  day: number;
  month: number;
  year: number;
  hour: number;
  minute: number;
  second: number;
}

interface System {
  time1: number;
  time2: number;
  time3: number;
  offTime1: number;
  offTime2: number;
  offTime3: number;
  offTime4: number;
}

interface System2 {
  a0: number[];
  a1: number[];
  a2: number[];
}

@Component({
  selector: "app-home",
  templateUrl: "home.page.html",
  styleUrls: ["home.page.scss"],
})
export class HomePage {
  app_name: string = "Dušan Custom Pump App";
  currentTime: Date;
  time_interface: Time;
  sys_interface: System = {
    time1: 8,
    time2: 16,
    time3: 20,
    offTime1: 1,
    offTime2: 1,
    offTime3: 1,
    offTime4: 1,
  };

  sys_interface2: System2 = {
    a0: this.range(0, this.sys_interface.time2 - 1),
    a1: this.range(this.sys_interface.time1 + 1, this.sys_interface.time3 - 1),
    a2: this.range(this.sys_interface.time2 + 1, 23),
  };

  wsServerUrl: string = "ws://192.168.4.1";
  wsServerPort: string = "80";
  wsState: boolean = false;
  ws: WebSocket;

  settings_array: Array<any> = [];
  isCheckSettings: boolean = false;
  ESP32_alert: string =
    "Povezava z napravo ni vzpostavljena, prosimo preverite WiFi povezavo.";
  ESP32_status;
  relay_card;

  webSocketLoading: any;
  settingsLoading: any;
  settings_alert: string = "";
  isSettingsOk: boolean = true;
  subscribe: any;
  constructor(
    public platform: Platform,
    public loadingController: LoadingController
  ) {
    this.subscribe = this.platform.backButton.subscribeWithPriority(
      666666,
      () => {
        if (this.constructor.name == "HomePage") {
          this.appClose();
        }
      }
    );
  }

  // WebSocket Loader module
  async presentWebSocketLoading() {
    console.log("Presenting loader");
    await this.webSocketLoading.present();
    const { role, data } = await this.webSocketLoading.onDidDismiss();
    console.log("WebSocket Loading dismissed!");
    this.createWebSocketLoading();
  }

  dismissWebSocketLoading() {
    this.webSocketLoading.dismiss();
  }

  async createWebSocketLoading() {
    this.webSocketLoading = await this.loadingController.create({
      cssClass: "my-custom-class",
      message: "Vzpostavljanje povezave ... ",
      duration: 10000,
    });
  }

  // Settings Loader module
  async presentSettingsLoading() {
    console.log("Presenting loader");
    await this.settingsLoading.present();
    const { role, data } = await this.settingsLoading.onDidDismiss();
    console.log("Settings Loading dismissed!");
    this.createSettingsLoading();
  }

  dismissSettingsLoading() {
    this.settingsLoading.dismiss();
  }

  async createSettingsLoading() {
    this.settingsLoading = await this.loadingController.create({
      cssClass: "my-custom-class",
      message: "Posodabljanje nastavitev ... ",
      duration: 10000,
    });
  }
  ngOnInit() {
    this.createWebSocketLoading();
    this.createSettingsLoading();

    console.log(this.sys_interface2);
    this.ESP32_status = document.querySelector("#esp32_status");
    this.relay_card = document.querySelector("#relay_card");
    let connect_to_ws = () => {
      console.log("Establishing connection with WebSocket server.");
      try {
        this.ws = new WebSocket(this.wsServerUrl);
      } catch (err) {
        console.log("ERROR: " + err);
      }
      this.ws.onopen = (event) => {
        this.wsState = true;
        this.dismissWebSocketLoading();
        this.currentTime = new Date();
        this.time_interface = {
          day: this.currentTime.getDate(),
          month: this.currentTime.getMonth(),
          year: this.currentTime.getFullYear(),
          hour: this.currentTime.getHours(),
          minute: this.currentTime.getMinutes(),
          second: this.currentTime.getSeconds(),
        };
        let timeJSONString = JSON.stringify(this.time_interface);
        console.log("Date and time JSON string: " + timeJSONString);
        let timeEncapsulated = this.encapsulateJSON("TIME", timeJSONString);
        console.log("Sending TIME");
        this.ws.send(timeEncapsulated);
        // this.updateValues();
        ESP32_connection();
      };

      console.log(this.sys_interface);
      this.ws.onmessage = (event) => {
        let dict = JSON.parse(event.data);
        for (let cmd in dict) {
          if (cmd == "SETTINGS") {
            if (this.isCheckSettings) {
              this.checkSettings(dict, cmd);
            }
            for (let key in dict[cmd]) {
              this.sys_interface[key] = dict[cmd][key];
              console.log("Got SETTINGS");
              this.sys_interface2 = {
                a0: this.range(0, this.sys_interface.time2 - 1),
                a1: this.range(
                  this.sys_interface.time1 + 1,
                  this.sys_interface.time3 - 1
                ),
                a2: this.range(this.sys_interface.time2 + 1, 23),
              };
              this.relay_card.hidden = false;
            }
          }
        }
      };

      this.ws.onclose = () => {
        console.log("Closing WebSocket connection");

        ESP32_disconnection();
      };
    };
    connect_to_ws();
    (async () => {
      do {
        if (this.ws.readyState == WebSocket.CONNECTING) {
          console.log("Connecting to WebSocket Server");
        } else if (this.ws.readyState == WebSocket.OPEN) {
          console.log("WebSocket Server connection is open");
        } else if (this.ws.readyState == WebSocket.CLOSING) {
          console.log("Closing WebSocket Server");
        } else if (this.ws.readyState == WebSocket.CLOSED) {
          console.log("Connection with WebSocket Server is closed.");
          connect_to_ws();
        }
        await delay(5000);
      } while (true);
    })();

    function delay(ms: number) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    let ESP32_connection = () => {
      // console.log(this.ESP32_alert.value);
      this.ESP32_alert = "Povezava z napravo je vzpostavljena.";
      this.ESP32_status.color = "success";
    };

    let ESP32_disconnection = () => {
      console.log();
      this.ESP32_alert =
        "Povezava z napravo ni vzpostavljena, prosimo preverite WiFi povezavo.";
      this.ESP32_status.color = "danger";
      this.relay_card.hidden = true;
      this.wsState = false;
      this.isCheckSettings = false;
      this.settings_alert = "";
    };
  }

  checkSettings(dict, cmd) {
    console.log("Checking settings");
    let temp_settings: System = {
      time1: -1,
      time2: -1,
      time3: -1,
      offTime1: -1,
      offTime2: -1,
      offTime3: -1,
      offTime4: -1,
    };

    for (let key in dict[cmd]) {
      temp_settings[key] = dict[cmd][key];
      console.log("Got SETTINGS");
    }
    console.log(temp_settings);
    console.log(this.sys_interface);
    for (let key in temp_settings) {
      if (this.sys_interface[key] == temp_settings[key]) {
        console.log("OK key");
      } else {
        console.log("KEy not ok");
        this.isSettingsOk = false;
        break;
      }
    }
    if (this.isSettingsOk) {
      this.isSettingsOk = true;
      this.settings_alert = "Posodobitve so bile uspešne.";
      this.dismissSettingsLoading();
    } else {
      this.isSettingsOk = false;
      this.settings_alert =
        "Posodobitve nastavitev niso bile uspešne, prosimo poskusite ponovno.";
    }
  }

  updateValues() {
    console.log("Updating values");
    console.log(this.sys_interface);
    this.settings_alert = "";
    this.ws.send(
      this.encapsulateJSON("SETTINGS", JSON.stringify(this.sys_interface))
    );
    this.presentSettingsLoading();
    this.isCheckSettings = true;
  }

  onTimeChanged(time1: number = -1, time2: number = -1, time3: number = -1) {
    console.log(time1);
    console.log(time2);
    console.log(time3);
    this.sys_interface2 = {
      a0: this.range(0, time2 - 1),
      a1: this.range(time1 + 1, time3 - 1),
      a2: this.range(time2 + 1, 23),
    };
  }

  encapsulateJSON(cmd: string, json: string) {
    let encapsulatedData = '{"' + cmd + '": ' + json + "}";
    console.log("Encapsulated data: " + encapsulatedData);
    return encapsulatedData;
  }

  range(start, end) {
    return [...Array(1 + end - start).keys()].map((v) => start + v);
  }

  // Closes app
  appClose() {
    console.log("Closing app");
    this.ws.close();
    navigator["app"].exitApp();
  }

  // Refreshes websocket connection (Closes old one starts a new one)
  refreshWebsocket() {
    console.log("Closing Websocket connection");
    this.ws.close();
    this.presentWebSocketLoading();
    console.log("Opening new websocket connection");
  }
  ngOnDestroy() {
    console.log("Destroying object");
    if (this.ws.readyState == WebSocket.OPEN) {
      this.ws.close();
      console.log("WS: " + this.ws);
      this.ws = undefined;
      console.log("WS: " + this.ws);
    }
  }
}
