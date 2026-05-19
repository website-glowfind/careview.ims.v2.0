import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { useRef } from "react";

interface ModalProps {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  children: React.ReactNode;
}

const MainModal: React.FC<ModalProps> = ({ modalOpen, setModalOpen, children }) => {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <Dialog
      open={modalOpen}
      onClose={() => setModalOpen(false)}
      initialFocus={cancelButtonRef}
      className="relative z-50"
    >
      {/* Backdrop */}
      <DialogBackdrop
        transition
        className="
          fixed inset-0 bg-darkColor/50 backdrop-blur-sm
          data-enter:opacity-0
          data-enter-active:opacity-100
          data-leave:opacity-100
          data-leave-active:opacity-0
          duration-300 ease-out
        "
      />

      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center px-4">
        
        {/* Panel Animation */}
        <DialogPanel
          transition
          className="
            inline-block align-middle
            data-enter:opacity-0 data-enter:scale-100
            data-enter-active:opacity-100 data-enter-active:scale-100
            data-leave:opacity-100 data-leave:scale-100
            data-leave-active:opacity-0 data-leave-active:scale-100
            duration-100 ease-out
          " 
        >
          {children}

          {/* Hidden close button for focus reference */}
          <button ref={cancelButtonRef} className="hidden" />
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default MainModal;
