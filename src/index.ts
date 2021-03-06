import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin,
} from "@jupyterlab/application";

import {
  Dialog, ICommandPalette, showDialog,
} from "@jupyterlab/apputils";

import {
  PageConfig,
} from "@jupyterlab/coreutils";

import {
  IDocumentManager,
} from "@jupyterlab/docmanager";

import {
  IFileBrowserFactory,
} from "@jupyterlab/filebrowser";

import {
  ILauncher,
} from "@jupyterlab/launcher";

import {
  IMainMenu,
} from "@jupyterlab/mainmenu";

import {
  Widget,
} from "@phosphor/widgets";

import {
  IRequestResult, request,
} from "./request";

import "../style/index.css";

// tslint:disable: variable-name

const extension: JupyterLabPlugin<void> = {
  activate,
  autoStart: true,
  id: "jupyterlab_templates",
  optional: [ILauncher],
  requires: [IDocumentManager, ICommandPalette, ILayoutRestorer, IMainMenu, IFileBrowserFactory],
};

let templates: string[];

export
class OpenTemplateWidget extends Widget {
  constructor() {
    const body = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = "Template:";

    const input = document.createElement("select");
    for (const t of templates) {
      const val = document.createElement("option");
      val.label = t[0];
      val.text  = t[0];
      val.value = t[2];
      input.appendChild(val);
    }

    // input.placeholder = 'select';

    body.appendChild(label);
    body.appendChild(input);
    super({ node: body });
  }

  public getValue(): string {
    return this.inputNode.value;
  }

  get inputNode(): HTMLSelectElement {
    return this.node.getElementsByTagName("select")[0] as HTMLSelectElement;
  }
}

function activate(app: JupyterLab,
                  docManager: IDocumentManager,
                  palette: ICommandPalette,
                  restorer: ILayoutRestorer,
                  menu: IMainMenu,
                  browser: IFileBrowserFactory,
                  launcher: ILauncher | null) {

  // grab templates from serverextension
  request("get", PageConfig.getBaseUrl() + "templates/get").then((res: IRequestResult) => {
    if (res.ok) {
        const sites = res.json() as {[key: string]: [string]};
        templates = sites.templates || [];
    }
  });

  // Add an application command
  const open_command = "template:open";

  app.commands.addCommand(open_command, {
    caption: "Initialize a notebook from a template notebook",
    execute: (args) => {
      showDialog({
          body: new OpenTemplateWidget(),
          buttons: [Dialog.cancelButton(), Dialog.okButton({ label: "GO" })],
          focusNodeSelector: "input",
          title: "Template",
        }).then((result) => {
          if (result.button.label === "CANCEL") {
            return;
          }

          const path = browser.defaultBrowser.model.path;

          return new Promise((resolve) => {
            app.commands.execute(
            "docmanager:new-untitled", {path, type: "notebook" },
          ).then((model) => {
            app.commands.execute("docmanager:open", {
              factory: "Notebook", path: model.path,
            }).then((widget) => {
              widget.context.ready.then(() => {
                widget.model.fromString(result.value);
                resolve(widget);
              });
            });
          });
        });
        });
      },
    iconClass: "jp-TemplateIcon",
    isEnabled: () => true,
    label: "Template",
  });

  // Add a launcher item if the launcher is available.
  if (launcher) {
    launcher.add({
      args: { isLauncher: true, kernelName: "template" },
      category: "Notebook",
      command: open_command,
// tslint:disable-next-line: max-line-length
      kernelIconUrl: "data:image/png;base64,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W5peiwoAgAoIYQAACYQwAIAE09y2aKL29vamfgroyMHBgVMJsCUjYQAACYQwAIAEQhgAQAIhDAAggRAGAJDA6sgJsaINAOphJAwAIIEQBgCQQAgDAEgghAEAJBDCAAASCGEAAAmEMACABEIYAEACIQwAIIEQBgCQQAgDAEhg78gJuemmm6Z+CgBW9sILLzhZ9EoIm5AXX3xx6qcAAKphOhIAIIEQBgCQQAgDAEgghAEAJFCYPyHPP//81E8BAFRDCJsQLSoAoB6mIwEAEghhAAAJhDAAgARCGABAAiEMACCBEAYAkEAIAwBIIIQBACQQwgAAEghhAAAJbFs0IbYtAljdCy+84GzRKyFsQl588cWpnwIAqIbpSACABEIYAEACIQwAIIEQBgCQQGH+hDz//PNTPwUAUA0hbEK0qACAepiOBABIIIQBACQQwgAAEghhAAAJhDAAgARCGABAAiEMACCBEAYAkEAIAwBIIIQBACSwbdGEPPDAA1M/BXTEZwlge3ullIPZdzk4f51TumN7l1557QUPDg56ffG9vb2q3jvD1fdnFejW/P3fsz7X/HPfdCQAQAIhDAAggRAGAJBACAMASGB15IRcuHBh6qcAAKohhE2ItgIAUA/TkQAACYQwAIAEQhgAQAIhDAAggRAGAJBACAMASCCEAQAkEMIAABIIYQAACYQwAIAEQhgAQAIhDAAggRAGAJBACAMASCCEAQAkEMIAABIIYQAACYQwAIAEp5z0euzt7U39FADAZBgJAwBIIIQBACQwHZns4Px1k37/ADBVRsIAABIIYQAACYQwAIAEQhgAQAIhDAAggRAGAJBACAMASCCEAQAkEMIAABIIYQAACYQwAIAEQhgAQAIhDAAggRAGAJBACAMASCCEAQAkEMIAABIIYQAACYQwAIAEQhgAQAIhDAAggRAGAJBACAMASCCEAQAkODWFk/7An/+/Co4CAKbrgV//+67+gkmEsItCGACkEsJez3QkAECCSYyEzbtw4UI9BwMAI3bx4kWXt8FeKeVg9scH56+r8Ri3tnfplde+xcHBQW+vAwAc2dvbe+3XY80Y65rPJKYjAQASCGEAAAmEMACABEIYAEACIQwAIIEQBgCQQAgDAEgghAEAJBDCAAASCGEAAAmEMACABEIYAEACIQwAmvzoR6U88B+cIjp3yikFgCX+51+XcvcnS7l69TCM7T/oTNEZI2EAcJKvfr2Uj/zOYQALX3768PegI0IYACy6/FQpv/3RUv7u747+4KFLpbz/vU4VnTEdCQDzov7ri186+o2f//lSHntEAKNzQhgAlLkC/Jh2nDl9+jCA/fI/c4ronBAGABHAov7rr/7m6FT80i+W8uQfl/LmN0/+9NAPNWEATFusgLztt44HsA9/UACjd0bCAJiuWO0YLSjmC/Dv/FgpD3zah4LeCWEATFOsgDx3/vhbjxWQt3/IB4KdEMIAmB4rIKmAEAbAdFgBSUWEMACmwQpIKmN1JADjZwUkFTISBsC4WQFJpYQwAMbLCkgqJoQBME5WQFI5IQyAcbECkoEQwgAYDysgGRCrIwEYBysgGRgjYQAMnxWQDJAQBsCwWQHJQAlhAAyXFZAMmBAGwPBYAckICGEADIsVkIyE1ZEADIcVkIyIkTAAhsEKSEZGCAOgflZAMkJCGAB1swKSkRLCAKiTFZCMnBAGQH2sgGQCrI6EsXj8iVJeermU9998WD8DQ2UFJBNhJAzG4HMPH3698Y2l/PSnhwXMEcQ+da+6GYbFCkgmxEgYDF08tCKAhQhgM197qZTf/mgpZ+8r5XtXXWbqFz84xGd2PoDFCkgBjJESwmDIom7m7Nyy/X/6zlJ+6wPH31AUNd/2rw+DWvx9qFEU4M+3oIgVkP/tv2hBwagJYTBkEcCuzo1y/af9Uh7eP3x4ve89R78fIwsRwqLORr0YNbn2g8R9x1tQxArIqP8ylc7ICWEwVBGmnr1ydPAX7j9ath8Pr3iIxVROPNBmIrDFaEOsOotpTMg0WwE534IiVkA+89+1oGAShDAYolg9FtM3M7eeKeWuO17/RmIqJx5oUaAf0zsz6sXIZgUkCGEwSOfuOypejnC1f2n5u4gHWoSwZ/7k8CE3T70YGWIUNkbA5qfSYwXk/oMCGJMihMHQxAjY/OhBdA9f5cF1/enDh5x6MTJZAQmvEcJgSJ65cryAeZM+YOrFyGIFJBwjhMFQzFaRzUQBc4SwTakXY1esgIQTCWEwFPNdxCM0Pfb57Q9cvRh9swISlhLCYAhiX8gYoZqJ+pnrT3d34OrF6IMVkNBICIPaxYPs4meODjIeYn3V0KgXoytWQEIrIQxqFlM5MQ05E8FoF6vI1IuxDSsgYSVCGNQsVpPNjySs2o6iC+rF2IQVkLAyIQxqFaMJ88XM89sS7ZJ6MVZhBSSsTQiDGsVU3/y2RBF+TtqWaJfUi7GMFZCwESEManT3JxbaUTxSz0GqF2OeFZCwMSEMahNTfPMPtBpXk6kXo1gBCdsSwqAm8VCL8DITD7TbztR7idSLTZcVkLA1IQxqsdiOImpqhvJAUy82LVZAQieEMKjF2fPH68AeenB4l0a92LhZAQmdEsKgBrEt0bNXjg4kRsCGuqpMvdg4WQEJnRPCINvitkS3nhnHtI56sfGwAhJ6IYRBphhdOHff0QHE1M7+pXFdEvViw2YFJPRGCINM+4vtKC6N98GmXmx4rICEXglhkOWZK8cLnCOcjL24Wb3YcFgBCb0TwiBDjPicnZuGjJqpCCdToV6sXlZAws4IYZAhHnLz7Sj2B9iOogvqxepiBSTslBAGuxYjPVEHNRMB7PrT074M6sXyWQEJOyeEwS4NbVuiXVIvlscKSEghhMGuXKu1mSt0jmmesxOqA1uVerHdsgIS0ghhsCsRwOZHGh4yytBIvVj/rICEVEIY7EKMNsxvS3ThfoXOq1Iv1j0rIKEKQhj0LQqeY8RhJrYluusOp30d6sW6YwUkVEMIg76dW2xHMbJtiXZJvdh2rICEqghh0KcYAZt/4D32iIddF9SLrc8KSKiOEAZ9meK2RLumXmw1VkBClYQw6MOs8Hkmam6mtC3RLqkXa2YFJFRLCIM+3P3J43Vgj33eae6berHjrICE6glh0LXHnzi+LVFM+Ux9W6JdUi9mBSQMhBAGXYrVZxc/c/QNY3rMtE+OqdaLWQEJgyGEQVdi9CGmIWdiFEbhc66p1YtZAQmDIoRBV6IAev7hpx1FPaZQL2YFJAyOEAZdiAfgfP2NbYnqNNZ6MSsgYZCEMNhW1BXNb0sUIy22JarbWOrFrICEQRPCYFt3f2KhHcUjTukQDL1ezApIGDwhDLYRD+n5VWgKoIdniPViVkDCKAhhsKmoHYqH9EysQrvtjNM5VEOpF7MCEkZDCINNLLajiGkgq9DGoeZ6MSsgYVSEMNjE2fPH68AeetBpHJMa68WsgITROeWSwppiW6Jnrxz9mxiFUAg9TrN6sQg6Ebpm21HN6sWefKqUs/f2G4Qi6EUAmy/Aj+nSWADic7fcD14p5ZvfrfXojvyrX6rlSEgghME6FrcluvWMkYgpiHqx+IrpwP2Hj+qxZvVi8fsxctZ1W4jZCsj5AvyY+laA3+6HPy7lK39d+1EKYRNnOhJWFQ/Ec/cd/eUYjdi/5PRNyS7rxayAhNETwmBV+4vtKC55GE7RLurFrICESRDCYBXPXDnelbyPqSeGpa/+YlZAwmQIYdAmppfOzk1DxgM3QhiUjvuLWQEJkyKEQZsIYPPtKPa1o+AE29SL2QMSJkkIgybzbQnKqzP63pEAAAozSURBVNsSXX/aKeNkm9SL2QMSJksIg2VsS8SmVq0XswISJk2fMDjJtemhudqcGJk4qw6MNbX1F3vDG0r52c+OvmcEfQX4MBlGwuAkEcDm2wM8pDUAW1hWL3ZwcPRrKyBhcoQwWLS4LdGF+9XmsL2T6sU+8m+sgIQJMx0J86JGZ3+uDiy2JbrrDqeI7szqxeJzFeH+399nlBUmykgYzDu32I7CtkT0ZDa6KoDBZAlhMBONMudXqT32iAckAL0RwqDYlgiA3RPCYNatfCbaUdiWCICeCWFw9yeP14E99vnJnxIA+ieEMW2L2xJFnybbEgGwA0IY0xXtKOa3JYreTXo1AbAjQhjTFHVgMQ05c/q0buUA7JQQxjRFO4r5bYm0owBgx4Qwpic2U/7y00dv27ZEACQQwpiW7109HAWbed97bEsEQAohjGm5+xML7Sge8QEAIIUQxnQsbksUmyirAwMgiRDGNHz168e3JbrzY6XcdsbFByCNEMb4LbajiG2JtKMAIJkQxvidPX+8DuyhB110ANIJYYzb40+U8uyVo7cYI2DaUQBQASGM8YptiS5+5ujt3XrGtkQAVEMIY5yiDuzcfUdvLbYl2r/kYgNQDSGMcXpdO4pL2lEAUBUhjPF55srxbYk+dW8p73+vCw1AVYQwxiW2JTo7Nw0Z2xJFCAOAyghhjEsEsPl2FPvaUQBQJyGM8fjcw6V87aWjtxMB7PrTLjAAVRLCGIfYlihC2IxtiQConBDG8EU7iuiKPxPbEp1VBwZA3YQwhi8C2NWrR28jtiXSjgKAyglhDNvitkQX7rctEQCDcMplYrBiW6L9uTqw2JborjsG827+78/+T/lfP/52BUfS7J+86Z3lH7zhH9Z8iACDJIQxXOcW21EMa1uiCGCP/c25Co6k2d2/+FB5+5v/ec2HCDBIpiMZpsVtiR57RB0YAIMihDE8sS3RF790dNi2JQJggIQwhuVaO4q5bYmiHYVtiQAYICGMYbn7k8frwB77vAsIwCAJYQzH4rZED3zatkQADJYQxjBEO4r5bYk+/MFSbv+QiwfAYAlh1C/qwGIacub06cNRMAAYMCGM+kU7ivltibSjAGAEhDDqdvmpUr789NEh2pYIgJEQwqjX964ejoLNvO89g9qWCACaCGHU6+5PLLSjeMTFAmA0hDDqtLgt0f6D6sAAGBUhjPp89evHtyW682Ol3HbGhQJgVIQw6rLYjiK2JdKOAoAREsKoy9nzx+vAHnrQBQJglIQw6vH4E6U8e+XocGIETDsKAEZKCKMOsS3Rxc8cHcqtZ2xLBMCoCWHkizqwc/cdHUZsS7R/yYUBYNSEMPK9rh3FJe0oABg9IYxcz1w5vi3Rp+4t5f3vdVEAGD0hjDyxLdHZuWnI2JYoQhgATIAQRp4IYPPtKPa1owBgOoQwcnzu4VK+9tLRS0cAu/60iwHAZAhh7F5sSxQhbMa2RABM0CkXnZ2KdhTRFX8mtiU6qw6MAfjff1XK/7hY/3H+ywul/KNfquBAgDZCGLsVAezq1aOXjG2JtKNgCH76o1Kufq3+A43jBAbBdCS7s7gt0YX7bUsEwGQJYexGbEu0P1cHFtsS3XWHkw/AZAlh7Ma5xXYUtiUCYNqEMPq3uC3RY4+oAwNg8oQw+hXbEn3xS0cvYVsiALhGCKM/19pRzG1LFO0obEsEANcIYfTn7k8erwN77PNONgC8SgijH4vbEj3wadsSAcAcIYzuRTuK+W2JPvzBUm7/kBMNAHOEMLoVdWAxDTlz+vThKBgAcIwQRreiHcX8tkTaUQDAiYQwunP5qVK+/PTRt7MtEQAsJYTRje9dPRwFm3nfe2xLBAANhDC6cfcnFtpRPOLEAkADIYztLW5LtP+gOjAAaCGEsZ2vfv34tkR3fqyU2844qQDQQghjc4vtKGJbIu0oAGAlQhibO3v+eB3YQw86mQCwIiGMzTz+RCnPXjn6pzECph0FAKxMCGN9sS3Rxc8c/bNbz9iWCADWJISxnqgDO3ff0T+JbYn2LzmJALAmIYz1vK4dxSXtKABgA0IYq3vmyvFtiT51bynvf68TCAAbEMJYTWxLdHZuGjK2JYoQBgBsRAhjNRHA5ttR7GtHAQDbEMJo97mHS/naS0d/LQLY9aedOADYghBGs9iWKELYjG2JAKATQhjLRTuK6Io/E9sSnVUHBgBdEMJY7vJTpVy9evTHsS2RdhQA0AkhjOXuuqOUC/cf/nH8r22JAKAzp5xKGkUQu+0WhfgA0DEjYbQTwACgc0IYAEACIQwAIIEQBgCQQAgDAEgghAEAJBDCAAASCGEAAAmEMACABEIYAEACIQwAIIEQBgCQQAgDAEgghAEAJBDCAAASCGEAAAmEMACABEIYAEACIQwAIIEQBgCQQAgDAEgghAEAJBDCAAASCGEAAAmEMACABEIYAEACIQwAIIEQBgCQQAgDAEhwykkfl5uefKX69/Mfb3pj+Rf/+A0VHAkA5DESBgCQQAgDAEgghAEAJBDCAAASCGEAAAmEMACABEIYAEACIQwAIIEQBgCQQAgDAEgghAEAJBDCAAASCGEAAAmEMACABEIYAEACIQwAIIEQBgCQQAgDAEgghAEAJBDCAAASCGEAAAmEMACABEIYAEACIQwAIIEQBgCQQAgDAEgghAEAJBDCAAASCGEAAAmEMACABEIYAEACIQwAIIEQBgCQQAgDAEgghAEAJBDCAAASCGEAAAmEMACABEIYAEACIQwAIIEQBgCQQAgDAEgghAEAJBDCAAASCGEAAAmEMACABEIYAEACIQwAIIEQBgCQQAgDAEgghAEAJBDCAAASCGEAAAmEMACABEIYAEACIQwAIIEQBgCQQAgDAEgghAEAJBDCAAASCGEAAAmEMACABEIYAEACIQwAIIEQBgCQQAgDAEiwV0o5mL3swfnrRnkN9i698tqvDw4OGv8uANCNvb29o+fvSDPGuuYziZEwAIAEQhgAQAIhDAAggRAGAJBACAMASCCEAQAkEMIAABIIYQAACYQwAIAEQhgAQAIhDAAggRAGAJBACAMASHBqaif9hRdeqOAoAICpm1wIu/nmmys4CgBg6kxHAgAkEMIAABJMYjry4Px1FRwFAMARI2EAAAmEMACABEIYAEACIQwAIIEQBgCQQAgDAEgghAEAJBDCAAASCGEAAAmEMACABEIYAEACIQwAIIEQBgCQQAgDAEgghAEAJBDCAAASCGEAAAmEMACABEIYAEACIQwAIIEQBgCQQAgDAEgghAEAJBDCAAASCGEAAAmEMACABEIYAEACIQwAIIEQBgCQQAgDAEgghAEAJBDCAAASCGEAAAmEMACABEIYAEACIQwAIIEQBgCQQAgDAEgghAEAJBDCAAASCGEAAAmEMACABEIYAEACIQwAIIEQBgCQQAgDAEgghAEAJBDCAAASCGEAAAmEMACABHullAMnHgBgt4yEAQAkEMIAAHatlPL/AUDGLAYtOayJAAAAAElFTkSuQmCC",
      rank: 1,
    });
  }

  if (menu) {
    // Add new text file creation to the file menu.
    menu.fileMenu.newMenu.addGroup([{ command: open_command }], 40);
  }

  // tslint:disable-next-line: no-console
  console.log("JupyterLab extension jupyterlab_templates is activated!");
}

export default extension;
export {activate as _activate};
