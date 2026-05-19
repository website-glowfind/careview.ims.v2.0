export interface InputTypes {
    label: string,
    name: string,
    type: string,
    placeholder: string
    value: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    disabled?: boolean
    required?: boolean
}

export interface MainModalProps {
    children: React.ReactNode
    modalOpen: boolean
    setModalOpen: (modalOpen: boolean) => void
}

export interface ChildrenModalProps {
    id?: number;
    name?: string;
    asset_type?: string;
    modalOpen: boolean;
    isSocketConnected?: boolean;
    setModalOpen: (open: boolean) => void;
    setIsSocketConnected?: (open: boolean) => void;
    onSubmit?: () => void;
}