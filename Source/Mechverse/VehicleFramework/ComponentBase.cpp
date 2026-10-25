#include "VehicleFramework/ComponentBase.h"

UComponentBase::UComponentBase()
	: InstallationState(EComponentInstallationState::InstalledTightened)
	, ParentSocketName(NAME_None)
{
	PrimaryComponentTick.bCanEverTick = false;
}

bool UComponentBase::CanBeRemoved(FText& OutReason) const
{
	if (InstallationState == EComponentInstallationState::Detached)
	{
		OutReason = FText::FromString(TEXT("Component is already detached."));
		return false;
	}

	// Verification of fasteners and child obstructions is checked in assembly manager
	OutReason = FText::FromString(TEXT("Ready for removal."));
	return true;
}

bool UComponentBase::CanBeInstalled(FText& OutReason) const
{
	if (InstallationState != EComponentInstallationState::Detached)
	{
		OutReason = FText::FromString(TEXT("Component is already installed."));
		return false;
	}

	OutReason = FText::FromString(TEXT("Ready for installation."));
	return true;
}

void UComponentBase::SetInstallationState(EComponentInstallationState NewState)
{
	InstallationState = NewState;
}

void UComponentBase::ApplyWear(float DeltaWear)
{
	Metadata.WearPercentage = FMath::Clamp(Metadata.WearPercentage + DeltaWear, 0.0f, 100.0f);
}

void UComponentBase::CleanComponent(float CleaningEfficiency)
{
	Metadata.CleanlinessPercentage = FMath::Clamp(Metadata.CleanlinessPercentage + CleaningEfficiency, 0.0f, 100.0f);
}
