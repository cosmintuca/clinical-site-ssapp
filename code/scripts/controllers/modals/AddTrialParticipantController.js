const {WebcController} = WebCardinal.controllers;
const LEGAL_ENTITY_MAX_AGE = 14;
let getInitModel = () => {
    return {
        name: {
            label: 'Name and Surname',
            name: 'name',
            required: true,
            placeholder: 'Full name',
            value: '',
        },

        did: {
            label: 'Public Identifier',
            name: 'did',
            required: true,
            placeholder: 'Public identifier',
            value: '',
        },
        birthdate: {
            label: 'Birth Date',
            name: 'date',
            required: true,
            dataFormat: 'MM YYYY',
            type: 'month',
            value: '',
        },
        isUnder14:false,
        didParent1: {
            label: 'Parent 1 Public Identifier',
            name: 'did',
            required: true,
            placeholder: 'Parent 1 Public Identifier',
            value: '',
        },
        didParent2: {
            label: 'Parent 2 Public Identifier',
            name: 'did',
            required: true,
            placeholder: 'Parent 2 Public Identifier',
            value: '',
        },
        gender: {
            label: 'Select your gender',
            required: true,
            options: [
                {
                    label: 'Select Gender',
                    value: '',
                    selected:true,
                    hidden:true
                },
                {
                    label: 'Male',
                    value: 'M',
                },
                {
                    label: 'Female',
                    value: 'F',
                },
            ],
            value: '',
        },

    };
};

export default class AddTrialParticipantController extends WebcController {
    constructor(...props) {
        super(...props);
        this.setModel(getInitModel());
        this._initHandlers();
    }

    _initHandlers() {
        this._attachHandlerSubmit();
    }

    _attachHandlerSubmit() {

        this.model.onChange("birthdate",()=>{
            let currentDate = Date.now()
            let birthDate = new Date(this.model.birthdate.value).getTime();

            let daysSinceBirth = (currentDate - birthDate) / (1000 * 3600 * 24);
            let legalEntityMaxAge = LEGAL_ENTITY_MAX_AGE * 365

            this.model.isUnder14 = legalEntityMaxAge > daysSinceBirth;
        })

        this.onTagEvent('tp:submit', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            const trialParticipant = {
                name: this.model.name.value,
                did: this.model.did.value,
                birthdate: this.model.birthdate.value,
                gender: this.model.gender.value,
            };
            this.send('confirmed', trialParticipant);
        });
    }
}
