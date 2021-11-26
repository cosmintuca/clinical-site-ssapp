import SiteService from "../../services/SiteService.js";
import HCOService from "../../services/HCOService.js";

const {WebcController} = WebCardinal.controllers;
import TrialService from '../../services/TrialService.js';

const commonServices = require("common-services");
const CommunicationService = commonServices.CommunicationService;
const DateTimeService = commonServices.DateTimeService;
const Constants = commonServices.Constants;
const BaseRepository = commonServices.BaseRepository;
let getInitModel = () => {
    return {
        trial: {},
        trialParticipants: [],
    };
};

export default class TrialDetailsController extends WebcController {

    constructor(...props) {
        super(...props);
        this.setModel({
            ...getInitModel(),
            trialSSI: this.history.win.history.state.state,
            subjects: {
                planned: '',
                screened: '',
                enrolled: '',
                percentage: '',
                withdrew: '',
                declined: '',
            },
            econsents: [],
            econsentsSize: 0
        });
        this._initServices();
        this._initHandlers();
        this._getSite();
    }

    async _initServices() {
        this.TrialService = new TrialService();
        this.SiteService = new SiteService();
        this.CommunicationService = CommunicationService.getInstance(CommunicationService.identities.ECO.HCO_IDENTITY);
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS);

        this.HCOService = new HCOService();
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        this._initTrial(this.model.trialSSI);
    }

    _initHandlers() {
        this._attachHandlerEditRecruitmentPeriod();
        this._attachHandlerNavigateToVersion();
        this._attachHandlerChangeStatus();
        this._attachHandlerBack();
        this.on('openFeedback', (e) => {
            this.feedbackEmitter = e.detail;
        });
    }

    async _initTrial(keySSI) {
        this.model.trial = this.model.hcoDSU.volatile.trial.find(t => t.uid === this.model.trialSSI);
        if (this.model.trial === undefined) {
            this.model.trial = {};
        }
        this.model.trialParticipants = (await this.TrialParticipantRepository.findAllAsync()).filter(tp => tp.trialNumber === this.model.trial.id);
        this.model.subjects.planned = this.model.trialParticipants.length;
        this.model.subjects.enrolled = this.model.trialParticipants.filter(tp => tp.status === Constants.TRIAL_PARTICIPANT_STATUS.ENROLLED).length;
        this.model.subjects.screened = this.model.trialParticipants.filter(tp => tp.status === Constants.TRIAL_PARTICIPANT_STATUS.SCREENED).length;
        this.model.subjects.withdrew = this.model.trialParticipants.filter(tp => tp.status === Constants.TRIAL_PARTICIPANT_STATUS.WITHDRAW).length;
        this.model.subjects.declined = this.model.trialParticipants.filter(tp => tp.status === Constants.TRIAL_PARTICIPANT_STATUS.DECLINED).length;
        this.model.subjects.percentage = ((this.model.subjects.enrolled * 100) / this.model.subjects.planned).toFixed(2) + '%';

        this.TrialService.getEconsents(this.model.trial.uid, (err, econsents) => {
            if (err) {
                return console.log(err);
            }
            this.model.econsents = econsents.map(econsent => {
                return {
                    ...econsent,
                    versions: econsent.versions.map(v => {
                        return {
                            ...v,
                            econsentSSI: econsent.uid,
                            versionDateAsString: DateTimeService.convertStringToLocaleDate(v.versionDate)
                        }
                    })
                }
            });
            this.model.econsentsSize = econsents.length;
        })
    }


    _attachHandlerBack() {
        this.onTagEvent('back', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            window.history.back();
        });
    }

    _attachHandlerChangeStatus() {
        this.onTagEvent('change-status', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.showModalFromTemplate(
                'confirmation-alert',
                (event) => {
                    const response = event.detail;
                    if (response) {
                        this.model.site.status = this.model.status === 'On Hold' ? 'Active' : 'On Hold';
                        this._updateSite ();
                    }
                },
                (event) => {
                    const response = event.detail;
                },
                {
                    controller: 'modals/ConfirmationAlertController',
                    disableExpanding: false,
                    disableBackdropClosing: false,
                    question: 'Are you sure you want to change status ? The current status is  ' + this.model.site.status + 'The status will be changed in ' + this.model.status === 'On Hold' ? 'Active' : 'On Hold',
                    title: 'Confirm visit',
                });
        });
    }

    _attachHandlerNavigateToVersion() {
        this.onTagEvent('navigate-to-version', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.navigateToPageTag('econsent-sign', {
                trialSSI: this.model.trialSSI,
                econsentSSI: model.econsentSSI,
                ecoVersion: model.version,
                controlsShouldBeVisible: false
            });

        });
    }

    _showFeedbackToast(title, message, alertType = 'toast') {
        if (typeof this.feedbackEmitter === 'function') {
            this.feedbackEmitter(message, title, alertType);
        }
    }

    _attachHandlerEditRecruitmentPeriod() {
        this.onTagEvent('edit-period', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.showModalFromTemplate(
                'edit-recruitment-period',
                (event) => {
                    const response = event.detail;
                    this.model.trial.recruitmentPeriod = response;
                    this.model.trial.recruitmentPeriod.toShowDate = new Date(this.model.trial.recruitmentPeriod.startDate).toLocaleDateString() + ' - ' + new Date(this.model.trial.recruitmentPeriod.endDate).toLocaleDateString();
                    this.TrialService.updateTrialAsync(this.model.trial)

                },
                (event) => {
                    const response = event.detail;
                },
                {
                    controller: 'modals/EditRecruitmentPeriodController',
                    disableExpanding: false,
                    disableBackdropClosing: false,
                    title: 'Edit Recruitment Period',
                    recruitmentPeriod: this.model.trial.recruitmentPeriod
                }
            );

        });

    }

    _getSite() {
        this.SiteService.getSites((err, sites) => {
            if (err) {
                return console.log(err);
            }
            if (sites && sites.length > 0) {
                let filtered = sites?.filter(site => site.trialKeySSI === this.model.trial.keySSI);
                if (filtered) this.model.site = filtered[0];
            }
        });
    }

    _updateSite() {
        this.SiteService.updateEntity(this.model.site, (err, site) => {
            if (err) {
                return console.log(err);
            }
        });
    }
}
