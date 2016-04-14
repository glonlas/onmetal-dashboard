/* eslint-env node */
'use strict';

var _ = require('underscore');

module.exports = {
  // These should be filled out in config.js
  dashboardUrl: 'http://localhost:9000/',
  regions: {
    /**
     * 'example-region': {
     *   ironic: {
     *     serviceHost: 'fake.ironic.api.com',
     *     servicePort: '6385',
     *     serviceProto: 'http',
     *     credentials: 'example-creds',        // can also be null for noauth
     *     refreshRate: 5 * 1000                // in milliseconds
     *   },
     *   neutron: {                             // neutron service is optional
     *     serviceHost: 'fake.neutron.api.com',
     *     servicePort: '9696',
     *     serviceProto: 'http',
     *     credentials: 'example-creds'         // can also be null for noauth
     *   },
     *   graphite: {
     *     metricsPrefix: 'fake.ironic.api.com' // will be prepended to all metrics namespaces before they are sent to graphite.
     *     endpoints: {
     *       render: 'http://127.0.0.1:81/render', // http endpoint where render API calls can be made.
     *       graphite: 'plaintext://192.168.0.4:2003' // endpoint where plaintext metrics can be sent.
     *     }
     *   }
     * }
     */
  },
  // These should be filled out in config.js
  credentials: {
    /**
     * 'example-creds': {
     *   authUrl: 'https://fake.auth.url.com',
     *   alertsUrl: 'http://fake.alerts.url.com',  // can be null
     *   username: 'USER',
     *   password: 'PASSWORD'
     * }
     */
  },
  irc: {
    /**
     * enabled: false,
     * server: 'irc.example.com',
     * nick: 'ironic-bot',
     * opts: {
     *   port: 6697,
     *   secure: true,
     *   userName: 'ironic-bot',
     *   realName: 'ironic alerts bot',
     *   channels: ['#ironic-channel'],
     * }
     */
  },
  flavors: [
    /**
     * These objects are iterated over in order, meaning more unique
     * `validate` methods should be higher up in this list.
     */
    {
      name: 'onmetal-memory1',
      chart: {
        color: '#0B486B'
      },
      validate: function (node) {
        var _512_GB = 512 * 1024;
        return node.properties.memory_mb === _512_GB;
      }
    },
    {
      name: 'onmetal-io1',
      chart: {
        color: '#3B8686'
      },
      validate: function (node) {
        var _128_GB = 128 * 1024;
        return node.properties.memory_mb === _128_GB;
      }
    },
    {
      name: 'onmetal-compute1',
      chart: {
        color: '#79BD9A'
      },
      validate: function (node) {
        var _32_GB = 32 * 1024;
        return node.properties.memory_mb === _32_GB;
      }
    },
    {
      name: 'unknown-flavor',
      chart: {
        color: '#000000'
      },
      validate: function () {
        return true;
      }
    }
  ],
  moods: [
    /**
     * These objects are iterated over in order, meaning more unique
     * `validate` methods should be higher up in this list.
     */
    {
      name: 'maintenance',
      label: 'Maintenance',
      moodType: 'bad',
      color: '#F3B12F',
      highlight: '#EFA548',
      validate: function (node) {
        return node.maintenance === true;
      }
    },
    {
      name: 'nobmc',
      label: 'BMC broken',
      moodType: 'bad',
      color: '#B61904',
      highlight: '#8E251F',
      validate: function (node) {
        return (node.power_state === null);
      }
    },
    {
      name: 'inactivewithinstance',
      label: 'Inactive with instance uuid',
      moodType: 'bad',
      color: '#F5ED9D',
      highlight: '#F3DE96',
      // This mood is transited by nodes being deployed, so we can't reliably
      // detect it. Leave the mood in place but make the validate function
      // always return false, as to not mess up metrics pushed to graphite
      validate: function(node) {
        return false;
      }
    },
    {
      name: 'stopped',
      label: 'Active but powered off',
      moodType: 'good',
      color: '#4DA337',
      highlight: '#639C47',
      validate: function (node) {
        return (node.provision_state === 'active' && node.power_state === 'power off');
      }
    },
    {
      name: 'noinstance',
      label: 'Active w/o instance',
      moodType: 'bad',
      color: '#F9CE33',
      highlight: '#EFBA4D',
      validate: function (node) {
        return (node.provision_state === 'active' && node.instance_uuid === null);
      }
    },
    {
      name: 'neutronfail',
      label: 'Neutron API Failure',
      moodType: 'bad',
      color: '#F2E572',
      highlight: '#EDD378',
      validate: function (node) {
        var port_not_found = new RegExp('exception: Port [A-Za-z0-9\-]+ could not be found');
        var postcommit_fail = new RegExp('(create|update)_port_postcommit failed');
        var fiveohtwo = new RegExp('502 Bad Gateway</h1>\nThe server returned an invalid');
        var fiveohfour = new RegExp('504 Gateway Time-out</h1>\nThe server didn\'t respond');
        var couldntremove = new RegExp('Tear down failed: Could not remove public network [0-9A-Za-z-]{36} from [0-9A-Za-z-]{36}, possible network issue');
        var correct_state = (node.provision_state === 'deploy failed') ||
                            (node.provision_state === 'clean failed') ||
                            (node.provision_state === 'decom failed');
        var correct_error = (port_not_found.exec(node.last_error) !==  null) ||
                            (postcommit_fail.exec(node.last_error) !== null) ||
                            (fiveohtwo.exec(node.last_error) !== null) ||
                            (fiveohfour.exec(node.last_error) !== null) ||
                            (couldntremove.exec(node.last_error) !== null);
        return correct_state && correct_error;
      }
    },
    {
      name: 'broken',
      label: 'Broken',
      moodType: 'bad',
      color: '#EA3A22',
      highlight: '#CE463B',
      validate: function (node) {
        return (node.provision_state === 'active' && node.instance_uuid === null) ||
               (node.provision_state === 'error') ||
               (node.provision_state === 'deploy failed') ||
               (node.provision_state === 'clean failed') ||
               (node.provision_state === 'decom failed');
      }
    },
    {
      name: 'noheartbeat',
      label: 'No Heartbeat',
      moodType: 'bad',
      color: '#EE7B28',
      highlight: '#E0743E',
      validate: function (node) {
        var now = Math.round(_.now() / 1000);
        var last_heartbeat = 0;
        if ('driver_internal_info' in node) {
          last_heartbeat = node.driver_internal_info.agent_last_heartbeat;
        } else {
          last_heartbeat = node.driver_info.agent_last_heartbeat;
        }
        var time_since_heartbeat = (now - last_heartbeat);
        var time_since_prov_state_update = (now - Date.parse(node.provision_updated_at)/1000);
        var is_cleaning = false;
        if (node.provision_state === 'decommissioning' ||
            node.provision_state === 'cleaning') {
          is_cleaning = true;
        }
        return  ((time_since_heartbeat > 300 && node.provision_state === null) ||
                 (time_since_heartbeat > 300 && is_cleaning
                                             && time_since_prov_state_update > 300));
      }
    },
    {
      name: 'clean',
      label: 'Cleaning',
      moodType: 'good',
      color: '#75B6D2',
      highlight: '#69A6BB',
      validate: function (node) {
        return (node.provision_state === 'decommissioning' ||
                node.provision_state === 'cleaning' ||
                node.provision_state === 'clean wait');
      }
    },
    {
      name: 'provisioned',
      label: 'Provisioned',
      moodType: 'good',
      color: '#78CD3B',
      highlight: '#8DC452',
      validate: function (node) {
        return (node.provision_state === 'active' && node.maintenance !== true &&
                node.instance_uuid !== null && node.power_state === 'power on');
      }
    },
    {
      name: 'deploying',
      label: 'Deploying',
      moodType: 'good',
      color: '#61C478',
      highlight: '#76BD80',
      validate: function (node) {
        return (node.provision_state === 'wait call-back' ||
                node.provision_state === 'deploying');
      }
    },
    {
      name: 'deleting',
      label: 'Deleting',
      moodType: 'good',
      color: '#A6D9FD',
      highlight: '#86C2E1',
      validate: function (node) {
        return (node.provision_state === 'deleting');
      }
    },
    {
      name: 'manageable',
      label: 'Manageable',
      moodType: 'good',
      color: '#93DADC',
      highlight: '#99D9DA',
      validate: function (node) {
        return (node.provision_state === 'manageable'&& node.instance_uuid === null);
      }
    },
    {
      name: 'reserved',
      label: 'Inactive but Reserved',
      moodType: 'good',
      color: '#949191',
      highlight: '#A4A3A3',
      validate: function (node) {
        return (('reserved_for_tenant_id' in node.properties && node.properties.reserved_for_tenant_id.length !== 0)
                || ('reserved_for_user_id' in node.properties && node.properties.reserved_for_user_id.length !== 0))
                && node.provision_state === 'available'
      }
    },
    {
      name: 'inactive',
      label: 'Inactive',
      moodType: 'good',
      color: '#BDBDBD',
      highlight: '#D7D7D7',
      validate: function (node) {
        return (node.provision_state === null || node.provision_state === 'available');
      }
    },
    {
      name: 'rescued',
      label: 'Rescued',
      moodType: 'good',
      color: '#935BCD',
      highlight: '#7360AA',
      validate: function (node) {
        return ((node.provision_state === 'rescue' && node.instance_uuid !== null) ||
          (node.provision_state === 'rescuewait' && node.instance_uuid !== null));
      }
    },
    {
      name: 'rescuefail',
      label: 'Rescue failed',
      moodType: 'bad',
      color: '#CF4384',
      highlight: '#C35A85',
      validate: function (node) {
        return node.provision_state == 'rescuefail'
      }
    },
    {
      name: 'unknown',
      label: 'Unknown (mood)',
      color: '#333333',
      highlight: '#222222',
      validate: function () {
        return true;
      }
    }
  ]
};
